import type { Collection } from './types'

const KEY = 'trove.recentCollections'
const MAX_RECENT = 8

export function nextRecentIds(recent: string[], collectionId: string): string[] {
  if (!collectionId) return recent
  return [collectionId, ...recent.filter(id => id !== collectionId)].slice(0, MAX_RECENT)
}

export function sortCollectionsByRecent<T extends { id: string; name: string }>(
  collections: T[],
  recentIds: string[],
): T[] {
  if (!recentIds.length) return collections
  const rank = new Map(recentIds.map((id, i) => [id, i]))
  return [...collections].sort((a, b) => {
    const aRank = rank.get(a.id)
    const bRank = rank.get(b.id)
    if (aRank !== undefined && bRank !== undefined) return aRank - bRank
    if (aRank !== undefined) return -1
    if (bRank !== undefined) return 1
    return a.name.localeCompare(b.name)
  })
}

function readStorage(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getRecentCollectionIds(): string[] {
  return readStorage()
}

export function recordCollectionUse(collectionId: string): void {
  if (!collectionId || typeof localStorage === 'undefined') return
  const next = nextRecentIds(readStorage(), collectionId)
  localStorage.setItem(KEY, JSON.stringify(next))
}

/** Recent folders for Save to pills (excludes current selection). */
export function recentFolderSlice(
  collections: Pick<Collection, 'id' | 'name' | 'icon' | 'color'>[],
  recentIds: string[],
  excludeId?: string | null,
  limit = 5,
): Pick<Collection, 'id' | 'name' | 'icon' | 'color'>[] {
  const byId = new Map(collections.map(c => [c.id, c]))
  const out: Pick<Collection, 'id' | 'name' | 'icon' | 'color'>[] = []
  const push = (c: Pick<Collection, 'id' | 'name' | 'icon' | 'color'>) => {
    if (excludeId && c.id === excludeId) return
    if (out.some(row => row.id === c.id)) return
    out.push(c)
  }
  for (const id of recentIds) {
    const c = byId.get(id)
    if (c) push(c)
    if (out.length >= limit) return out
  }
  for (const c of collections) {
    push(c)
    if (out.length >= limit) break
  }
  return out
}
