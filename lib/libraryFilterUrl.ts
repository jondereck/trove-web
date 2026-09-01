import type { LibraryFilter } from './types'

const FILTERS: readonly LibraryFilter[] = [
  'all',
  'unread',
  'fav',
  'reminders',
  'link',
  'github',
  'docs',
  'image',
  'video',
  'note',
  'tracker',
]

export function parseLibraryFilterParam(raw: string | null | undefined): LibraryFilter | null {
  if (!raw) return null
  return (FILTERS as readonly string[]).includes(raw) ? (raw as LibraryFilter) : null
}

export function libraryHref(filter: LibraryFilter = 'all'): string {
  if (filter === 'all') return '/library'
  return `/library?filter=${encodeURIComponent(filter)}`
}

/** Detail link that remembers which Library chip was active. */
export function detailHrefWithFrom(
  path: string,
  fromFilter: LibraryFilter | null | undefined,
): string {
  if (!fromFilter || fromFilter === 'all') return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}from=${encodeURIComponent(fromFilter)}`
}

export function libraryBackHref(
  fromParam: string | null | undefined,
  fallback: LibraryFilter = 'all',
): string {
  return libraryHref(parseLibraryFilterParam(fromParam) ?? fallback)
}
