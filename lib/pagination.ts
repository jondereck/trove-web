import type { LibraryFilter, Save } from './types'
import { filterSavesByChip } from './libraryFilters'

export function paginateFilteredSaves(
  saves: Save[],
  filter: LibraryFilter,
  offset: number,
  limit: number,
): { page: Save[]; total: number } {
  const filtered = filterSavesByChip(saves, filter)
  return {
    page: filtered.slice(offset, offset + limit),
    total: filtered.length,
  }
}

export function hasMorePages(loaded: number, total: number): boolean {
  return loaded < total
}
