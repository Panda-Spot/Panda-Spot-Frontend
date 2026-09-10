import { useEffect, useState } from 'react'
import { CheckCircle2, Columns3, LayoutGrid, List, XCircle, ZoomIn, ZoomOut } from 'lucide-react'
import { GALLERY_SORTS, useGalleryItems, useIdSelection } from './galleryTools.js'
import PhotoTiles from './PhotoTiles.jsx'
import GalleryEmpty from './GalleryEmpty.jsx'

// Shared member browser (AI Search members, Photo Selection members):
// the same Photos & Imports treatment — filter bar, grid/list/masonry +
// density slider, search, sort, Select mode with a page-scoped strip,
// scrollable viewport, pagination + page size.
//
// Differences stay in the parent via props: card overlays (renderCard),
// remove actions, empty copy. renderCard receives
// (photo, pageIndex, pageStart, searchedItems, pageItems) so fullscreen
// preview can index into the full ordered list, like Photos does.
// Selection here is tab-local (remove flows) and never touches the
// manager's add-selection.
export default function MemberBrowser({
  items,
  renderCard,
  onRemoveSelected,
  onRemoveAllVisible,
  removeTargetLabel = 'feature',
  emptyTitle = 'Nothing here yet',
  emptyHint = '',
  resultNoun = 'photo',
  initialPageSize = 24,
}) {
  const [galleryView, setGalleryView] = useState('grid')
  const [perRow, setPerRow] = useState(4)
  const [selectMode, setSelectMode] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [bulking, setBulking] = useState(false)
  const sel = useIdSelection()

  const searched = useGalleryItems(items, { query, sort })
  const itemCount = Array.isArray(items) ? items.length : 0
  const pageCount = Math.max(1, Math.ceil(searched.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageStart = (safePage - 1) * pageSize
  const paged = searched.slice(pageStart, pageStart + pageSize)
  const pagedIds = paged.map((p) => p.photo_id)
  const pageAllOn = pagedIds.length > 0 && pagedIds.every((id) => sel.selected[id])

  // items is rebuilt by the parent on every render (new array identity),
  // so key page resets on length/query/sort/size — never on identity,
  // or pagination would snap back to page 1 on any re-render.
  useEffect(() => { setPage(1) }, [itemCount, query, sort, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemoveSelected = async () => {
    if (sel.count === 0) return
    setBulking(true)
    try {
      const applied = await onRemoveSelected(sel.ids())
      if (applied !== false) sel.clear()
    } finally {
      setBulking(false)
    }
  }

  // "Remove all visible" takes even ticked photos out of the feature, so
  // the strip count resets with it — but only when it actually ran.
  const handleRemoveAllVisible = async () => {
    setBulking(true)
    try {
      const applied = await onRemoveAllVisible()
      if (applied !== false) sel.clear()
    } finally {
      setBulking(false)
    }
  }

  return (
    <div className="photo-browser">
      {selectMode && pagedIds.length > 0 && (
        <div className="photo-browser-select">
          <label className="checkbox-row" style={{ margin: 0 }} title="Select or deselect every photo on this page (other pages' ticks are kept)">
            <input
              type="checkbox"
              checked={pageAllOn}
              onChange={() => sel.toggleAll(pagedIds)}
            />
            Select all ({pagedIds.length})
          </label>
          <span className="select-count">{sel.count} selected</span>
          <div className="select-group">
            <span className="select-group-label">{removeTargetLabel}</span>
            <button className="btn secondary" type="button" disabled={bulking || sel.count === 0} onClick={handleRemoveSelected}>
              {bulking ? 'Removing…' : `Remove ${sel.count}`}
            </button>
            <button className="btn secondary" type="button" disabled={bulking || pagedIds.length === 0} onClick={handleRemoveAllVisible}>
              Remove all visible
            </button>
          </div>
          {sel.count > 0 && (
            <button className="icon-btn" type="button" title="Clear selection" onClick={sel.clear}>
              <XCircle size={16} />
            </button>
          )}
          <span className="hint" style={{ fontSize: 12, flexBasis: '100%' }}>
            Removals only change membership — files stay in Photos &amp; Imports.
          </span>
        </div>
      )}
      <div className="photo-browser-bar">
        <div className="view-switcher" aria-label="Gallery layout">
          {[
            { key: 'grid', icon: LayoutGrid, label: 'Grid' },
            { key: 'masonry', icon: Columns3, label: 'Masonry' },
            { key: 'list', icon: List, label: 'List' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              className={galleryView === key ? 'active' : ''}
              onClick={() => setGalleryView(key)}
              title={`${label} view`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        {galleryView !== 'list' && (
          <label className="per-row-slider" title="Photos per row — slide for fewer, bigger photos or more, smaller ones">
            <ZoomIn size={14} />
            <input
              type="range" min={2} max={10} step={1} value={perRow}
              onChange={(e) => setPerRow(Number(e.target.value))}
            />
            <ZoomOut size={14} />
          </label>
        )}
        <input
          className="text-input gallery-search"
          type="search"
          placeholder="Search by image name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="text-input" value={sort}
          onChange={(e) => setSort(e.target.value)}
          title="Sort photos"
          style={{ width: 'auto' }}
        >
          {GALLERY_SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <select
          className="text-input" value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          title="Photos per page"
          style={{ width: 'auto' }}
        >
          {[24, 48, 96].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button
          className={selectMode ? 'btn' : 'btn secondary'}
          type="button"
          onClick={() => setSelectMode((v) => !v)}
        >
          {selectMode ? 'Done' : 'Select'}
        </button>
      </div>
      <div className="photo-browser-body">
        {searched.length === 0 ? (
          <GalleryEmpty
            icon={query ? undefined : CheckCircle2}
            title={query ? 'No photos match' : emptyTitle}
            hint={query ? 'Try a different search.' : emptyHint}
          />
        ) : (
          <PhotoTiles
            items={paged}
            view={galleryView}
            perRow={perRow}
            renderCard={(p, i) => renderCard(p, i, pageStart, searched, paged)}
          />
        )}
      </div>
      <div className="photo-browser-footer">
        <span>
          Showing {searched.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + pageSize, searched.length)} of {searched.length} {resultNoun}{searched.length === 1 ? '' : 's'}
        </span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Page {safePage} of {pageCount}</span>
          <button className="btn secondary" type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
            Prev
          </button>
          <button className="btn secondary" type="button" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
            Next
          </button>
        </span>
      </div>
    </div>
  )
}
