import type { LibraryFilter } from './types'

export type LibraryFilterChipDef = {
  id: LibraryFilter
  label: string
}

export const LIBRARY_FILTER_CHIP_CATALOG: LibraryFilterChipDef[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'fav', label: 'Favorites' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'link', label: 'Links' },
  { id: 'github', label: 'GitHub' },
  { id: 'docs', label: 'Docs' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'note', label: 'Notes' },
  { id: 'tracker', label: 'Trackers' },
]

const CATALOG_IDS = LIBRARY_FILTER_CHIP_CATALOG.map(c => c.id)
const CATALOG_BY_ID = new Map(LIBRARY_FILTER_CHIP_CATALOG.map(c => [c.id, c]))

export function defaultLibraryFilterChipOrder(): LibraryFilter[] {
  return [...CATALOG_IDS]
}

export function visibleLibraryFilterChips(
  order: LibraryFilter[] = defaultLibraryFilterChipOrder(),
  hidden: LibraryFilter[] = [],
): LibraryFilterChipDef[] {
  const hiddenSet = new Set(hidden)
  return order
    .filter(id => CATALOG_BY_ID.has(id) && !hiddenSet.has(id))
    .map(id => CATALOG_BY_ID.get(id)!)
}
