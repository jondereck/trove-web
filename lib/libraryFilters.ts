import { classifyLinkSource } from './linkSource'
import type { LibraryFilter, Save } from './types'

export type { LibraryFilter } from './types'

function byPinnedThenCreated(a: Save, b: Save): number {
  const pinDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned)
  return pinDiff !== 0 ? pinDiff : b.created_at.localeCompare(a.created_at)
}

export function partitionPinnedSaves(saves: Save[]): { pinned: Save[]; rest: Save[] } {
  const pinned = saves.filter(s => s.is_pinned)
  const rest = saves.filter(s => !s.is_pinned)
  return { pinned, rest }
}

export function filterSavesByChip(saves: Save[], filter: LibraryFilter): Save[] {
  const library = saves.filter(s => !s.is_inbox && !s.is_vault)

  if (filter === 'all') return [...library].sort(byPinnedThenCreated)
  if (filter === 'unread') {
    return library.filter(s => s.is_viewed === false).sort(byPinnedThenCreated)
  }
  if (filter === 'fav') return library.filter(s => s.is_favorite).sort(byPinnedThenCreated)
  if (filter === 'reminders') return []
  if (filter === 'github' || filter === 'docs') {
    return library.filter(s => classifyLinkSource(s.url) === filter).sort(byPinnedThenCreated)
  }
  return library.filter(s => s.type === filter).sort(byPinnedThenCreated)
}
