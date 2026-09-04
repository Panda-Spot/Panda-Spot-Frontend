import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, FileText, List, Maximize, Minus, Plus, Square } from 'lucide-react'
import { fileUrl } from '../api.js'

// Shared album-spread viewer (Phase 23 core, Phase 5 feel) — used by the
// studio workspace and the client review page. Page-turn flipbook with
// single/spread modes, cover handling, zoom + pan, touch swipe, keyboard
// paging, print-PDF embed, and % positioned pin dots over each page.
//
// Loading strategy (large albums stay smooth): only the visible spread
// renders; each spread shows its thumbnail first, then swaps to the full
// file on load, with a shimmer skeleton meanwhile. If images fail, the
// viewer degrades to a plain stacked list (fallback toggle included) —
// no flipbook library involved, so there is nothing external to break.
// Pin placement: when `placing` is true, clicking (not dragging) a page
// reports 0-100 percentages via onPlace({ pageId, xPct, yPct }).
function SpreadImage({ page, zoomed, onLoaded, onFailed }) {
  const [phase, setPhase] = useState('thumb') // thumb | full | failed
  const fullUrl = fileUrl(page.file_url)
  const thumbUrl = page.thumbnail_url ? fileUrl(page.thumbnail_url) : fullUrl

  useEffect(() => { setPhase('thumb') }, [page.page_id])

  if (phase === 'failed') {
    return (
      <div className="flipbook-broken">
        <p className="hint">Spread {page.page_number} couldn&apos;t load.</p>
        <p className="hint">{page.filename}</p>
      </div>
    )
  }
  return (
    <>
      {phase === 'thumb' && <div className="flipbook-skeleton" aria-hidden />}
      <img
        key={phase}
        src={phase === 'thumb' ? thumbUrl : fullUrl}
        alt={`Spread page ${page.page_number}`}
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={() => {
          if (phase === 'thumb') {
            if (thumbUrl === fullUrl) {
              onLoaded?.()
              setPhase('full')
            } else {
              setPhase('full')
            }
          } else {
            onLoaded?.()
          }
        }}
        onError={() => {
          // Thumbnail failed → try the full file once; full failed → broken.
          if (phase === 'thumb' && thumbUrl !== fullUrl) setPhase('full')
          else {
            setPhase('failed')
            onFailed?.()
          }
        }}
        style={{
          width: `${100 * zoomed}%`,
          maxWidth: 'none',
          display: phase === 'thumb' ? 'none' : 'block',
          margin: '0 auto',
          borderRadius: 4,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      {phase === 'thumb' && thumbUrl !== fullUrl && (
        <img
          src={thumbUrl}
          alt=""
          aria-hidden
          draggable={false}
          loading="lazy"
          decoding="async"
          style={{ width: `${100 * zoomed}%`, maxWidth: 'none', display: 'block', margin: '0 auto', borderRadius: 4, filter: 'blur(2px)', userSelect: 'none', pointerEvents: 'none' }}
        />
      )}
    </>
  )
}

export default function AlbumFlipbook({
  pages = [],
  pdfUrl = null,
  pins = [],
  placing = false,
  onPlace = null,
  selectedPinId = null,
  onPinClick = null,
}) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const [index, setIndex] = useState(0) // left page in spread mode, current page in single
  const [spread, setSpread] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [withCover, setWithCover] = useState(true)
  const [turnDir, setTurnDir] = useState(0) // -1 | 0 | 1, drives the page-turn animation
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [simple, setSimple] = useState(false) // fallback stacked viewer
  const [failedPages, setFailedPages] = useState({})
  const dragRef = useRef(null) // { startX, startY, panX, panY, moved, pointerId }
  const touchRef = useRef(null) // { startX, startY }
  const suppressClickRef = useRef(false)

  const ordered = useMemo(() => [...(pages || [])].sort((a, b) => a.page_number - b.page_number), [pages])

  useEffect(() => { setIndex(0); setZoom(1); setPan({ x: 0, y: 0 }); setTurnDir(0); setFailedPages({}) }, [pdfUrl, ordered.length])

  const step = spread ? 2 : 1
  const maxIndex = Math.max(0, ordered.length - 1)
  const clamp = useCallback((i) => Math.max(0, Math.min(maxIndex, i)), [maxIndex])
  const go = useCallback((d) => {
    setTurnDir(d > 0 ? 1 : -1)
    setPan({ x: 0, y: 0 })
    setIndex((i) => clamp(i + d * step))
  }, [clamp, step])

  // Keyboard paging — ignored while typing in inputs.
  useEffect(() => {
    const handler = (e) => {
      if (/INPUT|TEXTAREA/.test(e.target?.tagName || '')) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go])

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen?.().catch(() => {})
  }

  // Spread pairs: with a cover, page 1 stands alone then pairs follow
  // ([1], [2,3], [4,5]…); without, pairs start immediately ([1,2], [3,4]…).
  const visible = useMemo(() => {
    if (pdfUrl || ordered.length === 0) return []
    if (!spread) return [ordered[clamp(index)]].filter(Boolean)
    if (withCover && ordered.length > 1) {
      if (index === 0) return [ordered[0]]
      // Cover stands alone, so pairs shift by one: index 2 → [p2,p3].
      const start = index - 1
      return [ordered[start], ordered[start + 1]].filter(Boolean)
    }
    return [ordered[clamp(index)], ordered[clamp(index) + 1]].filter(Boolean)
  }, [pdfUrl, ordered, spread, index, withCover, clamp])

  const pinsFor = (pageId) => (pins || []).filter((p) => p.pin_number != null && (p.page_id || null) === (pageId || null))

  // Desktop pan (mouse drag while zoomed). A drag suppresses the click so
  // panning never drops a pin by accident. Deliberately no pointer
  // capture — capturing would retarget clicks away from pin buttons.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || zoom <= 1 || simple) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, moved: false }
  }
  const onPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      drag.moved = true
      suppressClickRef.current = true
    }
    if (drag.moved) setPan({ x: drag.panX + dx, y: drag.panY + dy })
  }
  const onPointerUp = () => {
    dragRef.current = null
    setTimeout(() => { suppressClickRef.current = false }, 0)
  }

  // Mobile: horizontal swipe turns pages at 1x; drag pans when zoomed.
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchRef.current = { startX: t.clientX, startY: t.clientY, panned: false }
  }
  const onTouchMove = (e) => {
    const start = touchRef.current
    if (!start) return
    const t = e.touches[0]
    const dx = t.clientX - start.startX
    const dy = t.clientY - start.startY
    if (zoom > 1 && !simple) {
      if (Math.abs(dx) + Math.abs(dy) > 8) {
        start.panned = true
        suppressClickRef.current = true
        setPan((p) => ({ x: p.x + dx * 0.6, y: p.y + dy * 0.6 }))
        touchRef.current = { startX: t.clientX, startY: t.clientY, panned: true }
        if (e.cancelable) e.preventDefault()
      }
    }
  }
  const onTouchEnd = (e) => {
    const start = touchRef.current
    touchRef.current = null
    setTimeout(() => { suppressClickRef.current = false }, 0)
    if (!start || start.panned || zoom > 1 || simple) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.startX
    const dy = t.clientY - start.startY
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }

  const handlePageClick = (e, page) => {
    if (suppressClickRef.current) return
    if (!placing || !onPlace) return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10
    onPlace({ pageId: page?.page_id || null, xPct, yPct })
  }

  if (pdfUrl) {
    return (
      <div ref={containerRef} className="card" style={{ padding: 8, background: '#111113' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Print PDF — exact press file, page numbers may differ from spreads
          </span>
          <button type="button" className="btn secondary" onClick={toggleFullscreen} title="Fullscreen">
            <Maximize size={14} />
          </button>
        </div>
        <iframe
          title="Album print PDF"
          src={fileUrl(pdfUrl)}
          style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8, background: '#fff' }}
        />
      </div>
    )
  }

  if (ordered.length === 0) {
    return (
      <div className="card"><p className="hint">No spreads in this version yet.</p></div>
    )
  }

  // Fallback simple viewer: plain stacked spreads, no effects.
  if (simple) {
    return (
      <div ref={containerRef} className="card" style={{ padding: 12, background: '#111113' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="hint">Simple view — all {ordered.length} spreads</span>
          <button type="button" className="btn secondary" onClick={() => setSimple(false)} title="Back to flipbook">
            <BookOpen size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gap: 12, maxHeight: '70vh', overflow: 'auto' }}>
          {ordered.map((page) => (
            <div key={page.page_id}>
              <SpreadImage page={page} zoomed={1} />
              <p className="hint" style={{ marginTop: 4 }}>
                {page.page_number}. {page.filename}
                {pinsFor(page.page_id).map((p) => ` · pin ${p.pin_number}`).join('')}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const failedCount = Object.keys(failedPages).length

  return (
    <div ref={containerRef} className="card" style={{ padding: 12, background: '#111113' }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn secondary" onClick={() => go(-1)} disabled={index <= 0} title="Previous (←)">
            <ChevronLeft size={14} />
          </button>
          <span className="hint" style={{ minWidth: 90, textAlign: 'center' }}>
            {spread ? `Spread ${Math.floor(index / 2) + 1} / ${Math.ceil(ordered.length / 2)}` : `Page ${clamp(index) + 1} / ${ordered.length}`}
          </span>
          <button type="button" className="btn secondary" onClick={() => go(1)} disabled={index >= maxIndex} title="Next (→)">
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className={spread ? 'btn secondary' : 'upload-tab'}
            onClick={() => { setSpread((s) => !s); setIndex((i) => i) }}
            title={spread ? 'Single-page view' : 'Two-page spread view'}
          >
            {spread ? <Square size={14} /> : <BookOpen size={14} />}
          </button>
          {spread && ordered.length > 2 && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setWithCover((v) => !v)}
              title={withCover ? 'Treat page 1 as a standalone cover' : 'Pair pages from page 1'}
              style={withCover ? { borderColor: 'var(--gold, #d4af37)' } : undefined}
            >
              Cover
            </button>
          )}
          <button
            type="button" className="btn secondary"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
            title="Reset zoom and pan"
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="btn secondary" onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))} title="Zoom out">
            <Minus size={14} />
          </button>
          <button type="button" className="btn secondary" onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))} title="Zoom in">
            <Plus size={14} />
          </button>
          <button type="button" className="btn secondary" onClick={toggleFullscreen} title="Fullscreen (great on mobile)">
            <Maximize size={14} />
          </button>
          <button type="button" className="btn secondary" onClick={() => setSimple(true)} title="Simple stacked view (fallback)">
            <List size={14} />
          </button>
        </div>
      </div>

      {placing && (
        <p className="hint" style={{ color: '#FBBF24', marginBottom: 8 }}>
          Click anywhere on a spread to drop your pin there.
        </p>
      )}
      {zoom > 1 && (
        <p className="hint" style={{ marginBottom: 8 }}>Drag to pan around the zoomed spread.</p>
      )}

      <div
        ref={stageRef}
        className="row flipbook-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 4,
          overflow: zoom > 1 ? 'hidden' : 'auto',
          cursor: placing ? 'crosshair' : zoom > 1 ? 'grab' : undefined,
          background: '#0a0a0b',
          borderRadius: 8,
          padding: 12,
          touchAction: zoom > 1 ? 'none' : 'pan-y',
        }}
      >
        <div
          key={`${spread ? 's' : '1'}-${index}`}
          className={turnDir === 0 ? undefined : turnDir > 0 ? 'flipbook-turn-next' : 'flipbook-turn-prev'}
          style={{ display: 'flex', flex: 1, gap: 4, justifyContent: 'center', alignItems: 'flex-start', minWidth: 0 }}
          onAnimationEnd={() => setTurnDir(0)}
        >
          {visible.map((page) => (
            <div
              key={page.page_id}
              onClick={(e) => handlePageClick(e, page)}
              style={{
                position: 'relative',
                flex: spread ? '1 1 0' : '0 1 auto',
                maxWidth: spread ? '50%' : '100%',
                transform: `translate(${pan.x}px, ${pan.y}px)`,
              }}
            >
              <SpreadImage
                page={page}
                zoomed={zoom}
                onFailed={() => setFailedPages((f) => ({ ...f, [page.page_id]: true }))}
              />
              {pinsFor(page.page_id).map((pin) => (
                <button
                  key={pin.id}
                  type="button"
                  title={`Pin ${pin.pin_number}${pin.resolved_at ? ' (resolved)' : ''} — ${pin.message || ''}`}
                  onClick={(e) => { e.stopPropagation(); onPinClick?.(pin) }}
                  style={{
                    position: 'absolute',
                    left: `${pin.x_pct}%`,
                    top: `${pin.y_pct}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: selectedPinId === pin.id ? '2px solid #fff' : '2px solid rgba(255,255,255,0.65)',
                    background: pin.resolved_at ? 'rgba(52,211,153,0.9)' : 'rgba(245,158,11,0.92)',
                    color: '#111113',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: pin.resolved_at ? 0.55 : 1,
                  }}
                >
                  {pin.pin_number}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        {ordered[clamp(index)]?.filename}
        {spread && visible[1] && visible[1].page_id !== visible[0].page_id ? ` · ${visible[1].filename}` : ''}
        {failedCount > 0 ? ` · ${failedCount} spread${failedCount === 1 ? '' : 's'} failed to load` : ''}
        {/* Phase 6: open-pin count per visible spread. */}
        {visible.map((page) => {
          const open = pinsFor(page.page_id).filter((p) => !p.resolved_at).length
          return open > 0 ? ` · p.${page.page_number}: ${open} open pin${open === 1 ? '' : 's'}` : ''
        }).join('')}
      </p>
    </div>
  )
}
