import type { SupabaseClient } from '@supabase/supabase-js'
import {
  collectionCoverFields,
  coverPoolNeedsMore,
} from './collectionCovers'
import type { Collection, Save, SavesPageResult } from './types'
import { filterLibrarySaves } from './libraryCore'
import { attachSaveCountsFromMap } from './collectionsCore'

export type CollectionWithCount = Collection & { save_count: number }

export {
  attachSaveCounts,
  filterSavesForCollection,
  findCollectionById,
} from './collectionsCore'

async function fetchCollectionsRows(supabase: SupabaseClient): Promise<Collection[]> {
  const ordered = supabase.from('collections').select('*').order('name')
  const withVault = await ordered.eq('is_vault', false)
  if (!withVault.error) return (withVault.data ?? []) as Collection[]

  if (!/is_vault/.test(withVault.error.message)) throw withVault.error

  const fallback = await supabase.from('collections').select('*').order('name')
  if (fallback.error) throw fallback.error
  return (fallback.data ?? []) as Collection[]
}

async function fetchCollectionMeta(
  supabase: SupabaseClient,
): Promise<{ counts: Record<string, number>; coverPool: Record<string, CoverPoolEntry[]> }> {
  let result = await supabase
    .from('saves')
    .select('collection_id, image_url, url, title, content, description, type, created_at')
    .not('collection_id', 'is', null)
    .eq('is_inbox', false)
    .eq('is_vault', false)
    .order('created_at', { ascending: false })

  if (result.error && /is_vault/.test(result.error.message)) {
    result = await supabase
      .from('saves')
      .select('collection_id, image_url, url, title, content, description, type, created_at')
      .not('collection_id', 'is', null)
      .eq('is_inbox', false)
      .order('created_at', { ascending: false })
  }

  if (result.error) throw result.error

  const counts: Record<string, number> = {}
  const coverPool: Record<string, CoverPoolEntry[]> = {}

  for (const row of result.data ?? []) {
    const id = row.collection_id as string | null
    if (!id) continue
    counts[id] = (counts[id] ?? 0) + 1
    const pool = coverPool[id] ?? (coverPool[id] = [])
    if (coverPoolNeedsMore(pool)) {
      pool.push({
        image_url: row.image_url,
        url: row.url,
        title: row.title,
        content: row.content,
        description: row.description,
        type: row.type,
      })
    }
  }

  return { counts, coverPool }
}

type CoverPoolEntry = {
  image_url?: string | null
  url?: string | null
  title?: string | null
  content?: string | null
  description?: string | null
  type?: string | null
}

export async function fetchCloudCollections(
  supabase: SupabaseClient,
): Promise<CollectionWithCount[]> {
  const [collections, meta] = await Promise.all([
    fetchCollectionsRows(supabase),
    fetchCollectionMeta(supabase),
  ])

  return collections
    .map(c => {
      const { cover_slots } = collectionCoverFields(
        c.cover_image_url,
        meta.coverPool[c.id] ?? [],
      )
      return {
        ...c,
        save_count: meta.counts[c.id] ?? 0,
        cover_slots,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchCloudCollection(
  supabase: SupabaseClient,
  id: string,
): Promise<Collection | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  if ('is_vault' in data && data.is_vault) return null
  return data as Collection
}

export async function fetchCloudCollectionSavesPage(
  supabase: SupabaseClient,
  collectionId: string,
  offset: number,
  limit: number,
): Promise<SavesPageResult> {
  let result = await supabase
    .from('saves')
    .select('*', { count: 'exact' })
    .eq('collection_id', collectionId)
    .eq('is_vault', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (result.error && /is_vault/.test(result.error.message)) {
    result = await supabase
      .from('saves')
      .select('*', { count: 'exact' })
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  }

  if (result.error) throw result.error
  return {
    saves: filterLibrarySaves((result.data ?? []) as Save[]),
    total: result.count ?? 0,
  }
}

/** @deprecated Prefer fetchCloudCollectionSavesPage. */
export async function fetchCloudCollectionSaves(
  supabase: SupabaseClient,
  collectionId: string,
): Promise<Save[]> {
  const { saves } = await fetchCloudCollectionSavesPage(supabase, collectionId, 0, 500)
  return saves
}

export function attachSaveCountsWithCovers(
  collections: Collection[],
  saves: Save[],
): CollectionWithCount[] {
  const withCounts = attachSaveCountsFromMap(collections, saves)
  const byCollection: Record<string, Save[]> = {}
  for (const save of filterLibrarySaves(saves)) {
    if (!save.collection_id) continue
    const list = byCollection[save.collection_id] ?? (byCollection[save.collection_id] = [])
    list.push(save)
  }
  return withCounts.map(c => ({
    ...c,
    cover_slots: collectionCoverFields(c.cover_image_url, byCollection[c.id] ?? []).cover_slots,
  }))
}
