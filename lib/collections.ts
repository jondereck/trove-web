import type { SupabaseClient } from '@supabase/supabase-js'
import type { Collection, Save } from './types'
import { filterLibrarySaves } from './libraryCore'

export type CollectionWithCount = Collection & { save_count: number }

export function attachSaveCounts(
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

async function fetchCollectionsRows(supabase: SupabaseClient): Promise<Collection[]> {
  const ordered = supabase.from('collections').select('*').order('name')
  const withVault = await ordered.eq('is_vault', false)
  if (!withVault.error) return (withVault.data ?? []) as Collection[]

  if (!/is_vault/.test(withVault.error.message)) throw withVault.error

  const fallback = await supabase.from('collections').select('*').order('name')
  if (fallback.error) throw fallback.error
  return (fallback.data ?? []) as Collection[]
}

async function fetchCollectionSaveCounts(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  let query = supabase
    .from('saves')
    .select('collection_id')
    .not('collection_id', 'is', null)
    .eq('is_inbox', false)

  const withVault = await query.eq('is_vault', false)
  const rows = withVault.error && /is_vault/.test(withVault.error.message)
    ? (await supabase
        .from('saves')
        .select('collection_id')
        .not('collection_id', 'is', null)
        .eq('is_inbox', false)).data
    : withVault.data

  if (withVault.error && !/is_vault/.test(withVault.error.message)) throw withVault.error

  const counts: Record<string, number> = {}
  for (const row of rows ?? []) {
    const id = row.collection_id as string | null
    if (!id) continue
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

export async function fetchCloudCollections(
  supabase: SupabaseClient,
): Promise<CollectionWithCount[]> {
  const [collections, counts] = await Promise.all([
    fetchCollectionsRows(supabase),
    fetchCollectionSaveCounts(supabase),
  ])
  return collections
    .map(c => ({ ...c, save_count: counts[c.id] ?? 0 }))
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

export async function fetchCloudCollectionSaves(
  supabase: SupabaseClient,
  collectionId: string,
): Promise<Save[]> {
  let query = supabase
    .from('saves')
    .select('*')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false })

  const withVault = await query.eq('is_vault', false)
  if (withVault.error && /is_vault/.test(withVault.error.message)) {
    const fallback = await supabase
      .from('saves')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
    if (fallback.error) throw fallback.error
    return filterLibrarySaves((fallback.data ?? []) as Save[])
  }

  if (withVault.error) throw withVault.error
  return filterLibrarySaves((withVault.data ?? []) as Save[])
}
