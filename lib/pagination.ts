import type { Save } from './types'
import { filterLibrarySaves } from './libraryCore'

export function paginateLocalSaves(
  saves: Save[],
  offset: number,
  limit: number,
): { page: Save[]; total: number } {
  const lib = filterLibrarySaves(saves).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
  return {
    page: lib.slice(offset, offset + limit),
    total: lib.length,
  }
}

export function hasMorePages(loaded: number, total: number): boolean {
  return loaded < total
}
