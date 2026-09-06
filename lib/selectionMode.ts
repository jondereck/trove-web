/** Pure helpers for multi-select (mobile Library selection mode parity). */

export function toggleSelectedId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function selectAllIds(ids: string[]): Set<string> {
  return new Set(ids)
}

export function savesFromIds<T extends { id: string }>(
  saves: T[],
  selected: ReadonlySet<string>,
): T[] {
  return saves.filter(s => selected.has(s.id))
}

export type BulkReadAction = {
  label: string
  is_viewed: boolean
}

/** Match mobile: if any unread → Mark as read; else Mark as unread. */
export function bulkReadAction(
  selected: { is_viewed?: boolean }[],
): BulkReadAction {
  const anyUnread = selected.some(s => !s.is_viewed)
  return anyUnread
    ? { label: 'Mark as read', is_viewed: true }
    : { label: 'Mark as unread', is_viewed: false }
}
