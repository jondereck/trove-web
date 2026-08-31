import type { CollectionWithCount } from './collections'
import type { LibraryFilter, Save } from './types'

const STORAGE_KEY = 'trove-web.library-cache.v1'

export type LibraryPageCache = {
  saves: Save[]
  total: number
  filter: LibraryFilter
  collectionId?: string
  cachedAt: string
}

export type LibrarySessionCache = {
  collections: CollectionWithCount[]
  firstName?: string
  pages: Record<string, LibraryPageCache>
  cachedAt: string
}

let memory: LibrarySessionCache | null = null

export function pageCacheKey(filter: LibraryFilter, collectionId?: string): string {
  return collectionId ? `collection:${collectionId}:${filter}` : `library:${filter}`
}

export function peekLibrarySessionCache(): LibrarySessionCache | null {
  if (memory) return memory
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    memory = JSON.parse(raw) as LibrarySessionCache
    return memory
  } catch {
    return null
  }
}

export function peekPageCache(
  filter: LibraryFilter,
  collectionId?: string,
): LibraryPageCache | null {
  const session = peekLibrarySessionCache()
  if (!session) return null
  return session.pages[pageCacheKey(filter, collectionId)] ?? null
}

function persist(session: LibrarySessionCache): void {
  memory = session
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // non-fatal — quota or private mode
  }
}

export function cacheSessionMetadata(patch: {
  collections?: CollectionWithCount[]
  firstName?: string
}): void {
  const existing = peekLibrarySessionCache()
  const next: LibrarySessionCache = {
    collections: patch.collections ?? existing?.collections ?? [],
    firstName: patch.firstName ?? existing?.firstName,
    pages: existing?.pages ?? {},
    cachedAt: new Date().toISOString(),
  }
  persist(next)
}

export function cachePageSnapshot(snapshot: {
  saves: Save[]
  total: number
  filter: LibraryFilter
  collectionId?: string
}): void {
  if (!snapshot.saves.length) return
  const existing = peekLibrarySessionCache()
  const key = pageCacheKey(snapshot.filter, snapshot.collectionId)
  const next: LibrarySessionCache = {
    collections: existing?.collections ?? [],
    firstName: existing?.firstName,
    pages: {
      ...(existing?.pages ?? {}),
      [key]: {
        saves: snapshot.saves,
        total: snapshot.total,
        filter: snapshot.filter,
        collectionId: snapshot.collectionId,
        cachedAt: new Date().toISOString(),
      },
    },
    cachedAt: new Date().toISOString(),
  }
  persist(next)
}

export function patchCachedSave(id: string, patch: Partial<Save>): void {
  const session = peekLibrarySessionCache()
  if (!session) return
  const pages: Record<string, LibraryPageCache> = {}
  for (const [key, page] of Object.entries(session.pages)) {
    pages[key] = {
      ...page,
      saves: page.saves.map(save => (save.id === id ? { ...save, ...patch } : save)),
    }
  }
  persist({ ...session, pages, cachedAt: new Date().toISOString() })
}

export function clearLibraryCache(): void {
  memory = null
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
