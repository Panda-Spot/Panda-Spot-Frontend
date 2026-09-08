// One container for the three studio gallery layouts. `renderCard` draws a
// single `.photo-card` (each page owns its card markup + actions); this only
// decides geometry:
// - grid: fixed N-per-row grid (perRow comes from the 2–10 slider)
// - masonry: CSS columns (cards keep natural image height — callers must
//   pass style={{ height: 'auto' }} to GalleryMedia in this mode, since its
//   default inline style pins height for uniform grid rows)
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
    return (
      <div className="masonry-grid" style={{ columns: `${perRow}` }}>
        {rows.map((p, i) => (
          <div key={p.photo_id || i} className="masonry-item">
            {renderCard(p, i)}
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
