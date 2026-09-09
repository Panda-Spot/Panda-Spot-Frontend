// One container for the three studio gallery layouts. `renderCard` draws a
// single `.photo-card` (each page owns its card markup + actions); this only
// decides geometry:
// - grid: fixed N-per-row grid (perRow comes from the 2–10 slider)
// - masonry: N equal flex columns (round-robin) with natural image heights —
//   deterministic, so it always spans the full width. (CSS multicol was
//   tried first: Chrome mis-balances columns once images load late, leaving
//   dead empty columns on the right.) Callers must pass
//   style={{ height: 'auto' }} to GalleryMedia in this mode, since its
//   default inline style pins height for uniform grid rows.
// - list: single-column horizontal rows reusing the same card markup
export default function PhotoTiles({ items, view = 'grid', perRow = 4, renderCard }) {
  const rows = Array.isArray(items) ? items : []
  if (view === 'list') {
    return (
      <div className="photo-list">
        {rows.map((p, i) => (
          <div key={p.photo_id || i} className="photo-list-row">
            {renderCard(p, i)}
          </div>
        ))}
      </div>
    )
  }
  if (view === 'masonry') {
    const cols = Math.max(1, Math.min(10, perRow || 4))
    const buckets = Array.from({ length: cols }, () => [])
    rows.forEach((p, i) => buckets[i % cols].push([p, i]))
    return (
      <div className="masonry-grid">
        {buckets.map((bucket, c) => (
          <div key={c} className="masonry-col">
            {bucket.map(([p, i]) => (
              <div key={p.photo_id || i} className="masonry-item">
                {renderCard(p, i)}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="photo-grid" style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}>
      {rows.map((p, i) => renderCard(p, i))}
    </div>
  )
}
