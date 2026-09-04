import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, FileText, Maximize, Minus, Plus, Square } from 'lucide-react'
import { fileUrl } from '../api.js'

// Shared album-spread viewer (Phase 23) — used by the studio workspace and
// the client review page. Single/spread modes, zoom, fullscreen, cover
// handling, print-PDF embed, and % positioned pin dots over each page.
// Pin placement: when `placing` is true, clicking a page reports the
// click as 0-100 percentages via onPlace({ pageId, xPct, yPct }).
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
  const [index, setIndex] = useState(0) // left page in spread mode, current page in single
  const [spread, setSpread] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [withCover, setWithCover] = useState(true)

  const ordered = useMemo(() => [...(pages || [])].sort((a, b) => a.page_number - b.page_number), [pages])

  useEffect(() => { setIndex(0); setZoom(1) }, [pdfUrl, ordered.length])

  const step = spread ? 2 : 1
  const maxIndex = Math.max(0, ordered.length - 1)
  const clamp = useCallback((i) => Math.max(0, Math.min(maxIndex, i)), [maxIndex])
  const go = useCallback((d) => setIndex((i) => clamp(i + d * step)), [clamp, step])

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

  const handlePageClick = (e, page) => {
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
          <button type="button" className="btn secondary" onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))} title="Zoom out">
            <Minus size={14} />
          </button>
          <span className="hint" style={{ minWidth: 44, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn secondary" onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))} title="Zoom in">
            <Plus size={14} />
          </button>
          <button type="button" className="btn secondary" onClick={toggleFullscreen} title="Fullscreen">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      {placing && (
        <p className="hint" style={{ color: '#FBBF24', marginBottom: 8 }}>
          Click anywhere on a spread to drop your pin there.
        </p>
      )}

      <div
        className="row"
        style={{
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 4,
          overflow: 'auto',
          cursor: placing ? 'crosshair' : undefined,
          background: '#0a0a0b',
          borderRadius: 8,
          padding: 12,
        }}
      >
        {visible.map((page) => (
          <div
            key={page.page_id}
            onClick={(e) => handlePageClick(e, page)}
            style={{ position: 'relative', flex: spread ? '1 1 0' : '0 1 auto', maxWidth: spread ? '50%' : '100%' }}
          >
            <img
              src={fileUrl(page.file_url)}
              alt={`Spread page ${page.page_number}`}
              draggable={false}
              style={{
                width: `${100 * zoom}%`,
                maxWidth: 'none',
                display: 'block',
                margin: '0 auto',
                borderRadius: 4,
                userSelect: 'none',
              }}
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
      <p className="hint" style={{ marginTop: 8 }}>
        {ordered[clamp(index)]?.filename}
        {spread && visible[1] && visible[1].page_id !== visible[0].page_id ? ` · ${visible[1].filename}` : ''}
      </p>
    </div>
  )
}
