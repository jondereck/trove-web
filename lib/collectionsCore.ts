import type { Collection, Save } from './types'
import { filterLibrarySaves } from './libraryCore'

export type CollectionWithCount = Collection & { save_count: number }

export function attachSaveCountsFromMap(
  collections: Collection[],
  saves: Save[],
): CollectionWithCount[] {
  const lib = filterLibrarySaves(saves)
  const counts: Record<string, number> = {}
  for (const save of lib) {
    if (!save.collection_id) continue
    counts[save.collection_id] = (counts[save.collection_id] ?? 0) + 1
  }
  return collections
    .map(c => ({ ...c, save_count: counts[c.id] ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function attachSaveCounts(
  collections: Collection[],
  saves: Save[],
): CollectionWithCount[] {
  return attachSaveCountsFromMap(collections, saves)
}

export function filterSavesForCollection(saves: Save[], collectionId: string): Save[] {
  return filterLibrarySaves(saves)
    .filter(s => s.collection_id === collectionId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function findCollectionById(
  collections: Collection[],
  id: string,
): Collection | undefined {
  return collections.find(c => c.id === id)
}
