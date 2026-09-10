import { useMemo, useState } from 'react'

// Shared client-side gallery helpers: name search + sort for the studio
// photo grids (Photos & Imports, Selection members, AI Search members).
// Server-side source/tool filters still run in EventWorkspace — this only
// refines the already-visible rows.

export const GALLERY_SORTS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name-asc', label: 'Name A–Z' },
  { key: 'name-desc', label: 'Name Z–A' },
]

const byCreated = (dir) => (a, b) => dir * (new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
const byName = (dir) => (a, b) => dir * String(a.filename || '').localeCompare(String(b.filename || ''))

const SORTERS = {
  newest: byCreated(1),
  oldest: byCreated(-1),
  'name-asc': byName(1),
  'name-desc': byName(-1),
}

export function useGalleryItems(items, { query, sort }) {
  return useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    const rows = Array.isArray(items) ? items : []
    const searched = q
      ? rows.filter((p) => String(p.filename || '').toLowerCase().includes(q))
      : rows
    return [...searched].sort(SORTERS[sort] || SORTERS.newest)
  }, [items, query, sort])
}

// Tab-local id-keyed selection for member browsers (AI Search / Photo
// Selection remove-flows). Page-persistent by construction (ids live
// outside pagination), merge-aware toggling, single-key deselect.
// Independent from the manager's add-selection so counts never mix.
export function useIdSelection() {
  const [selected, setSelected] = useState({})
  const count = Object.keys(selected).length
  const toggle = (id) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }
  const toggleAll = (ids) => {
    const list = Array.isArray(ids) ? ids : []
    setSelected((prev) => {
      const allOn = list.length > 0 && list.every((id) => prev[id])
      const next = { ...prev }
      if (allOn) {
        for (const id of list) delete next[id]
      } else {
        for (const id of list) next[id] = true
      }
      return next
    })
  }
  const clear = () => setSelected({})
  const ids = () => Object.keys(selected)
  return { selected, count, toggle, toggleAll, clear, ids }
}
