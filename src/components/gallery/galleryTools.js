import { useMemo } from 'react'

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
