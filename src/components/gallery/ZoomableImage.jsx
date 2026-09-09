import { useEffect, useRef, useState } from 'react'

const MIN_ZOOM = 1
const MAX_ZOOM = 4

// Fullscreen image with zoom + pan, shared by every full-page viewer
// (studio lightbox, AI face viewer, guest + client lightboxes):
// - mouse wheel or +/- keys zoom around the center, 0 resets
// - double-click toggles 2.5x
// - two-finger pinch zooms, one-finger drag pans while zoomed
// - arrows/Esc stay owned by the parent viewer (it already handles them)
export default function ZoomableImage({ src, alt, className, style, draggable = false, onLoad, onError, onZoomChange }) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const pointers = useRef(new Map())
  const pinchBase = useRef(null)
  const dragBase = useRef(null)

  useEffect(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    onZoomChange?.(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.5).toFixed(2)))
      else if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.5).toFixed(2)))
      else if (e.key === '0') { setZoom(1); setOffset({ x: 0, y: 0 }) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const applyZoom = (z) => {
    const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +z.toFixed(2)))
    setZoom(nz)
    if (nz === MIN_ZOOM) setOffset({ x: 0, y: 0 })
    onZoomChange?.(nz)
  }

  const onWheel = (e) => {
    applyZoom(zoom + (e.deltaY < 0 ? 0.4 : -0.4))
  }

  const onDoubleClick = () => {
    applyZoom(zoom > 1 ? MIN_ZOOM : 2.5)
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchBase.current = { dist: dist(a, b), zoom }
      dragBase.current = null
      setDragging(false)
    } else if (pointers.current.size === 1 && zoom > MIN_ZOOM) {
      dragBase.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
      setDragging(true)
    }
  }

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinchBase.current) {
      const [a, b] = [...pointers.current.values()]
      const d = dist(a, b)
      if (pinchBase.current.dist > 0 && d > 0) {
        applyZoom(pinchBase.current.zoom * (d / pinchBase.current.dist))
      }
    } else if (pointers.current.size === 1 && dragBase.current && zoom > MIN_ZOOM) {
      const cap = 260 * zoom
      setOffset({
        x: Math.max(-cap, Math.min(cap, e.clientX - dragBase.current.x)),
        y: Math.max(-cap, Math.min(cap, e.clientY - dragBase.current.y)),
      })
    }
  }

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchBase.current = null
    if (pointers.current.size === 0) {
      dragBase.current = null
      setDragging(false)
    }
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={draggable}
      onLoad={onLoad}
      onError={onError}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      style={{
        ...style,
        touchAction: 'none',
        cursor: zoom > MIN_ZOOM ? (dragging ? 'grabbing' : 'grab') : undefined,
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
        transition: dragging ? undefined : 'transform 0.15s ease-out',
      }}
    />
  )
}
