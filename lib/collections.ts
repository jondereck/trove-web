import type { SupabaseClient } from '@supabase/supabase-js'
import {
  collectionCoverFields,
  coverPoolNeedsMore,
} from './collectionCovers'
import { postgresUrlOrFilter } from './linkSource'
import { listSaveIdsWithUpcomingReminders } from './libraryReminderFilter'
import { ensureRemindersSynced } from './reminderSession'
import type { Collection, LibraryFilter, Save, SavesPageResult } from './types'
import { filterLibrarySaves } from './libraryCore'
import { sortByPinnedThenCreated } from './libraryFilters'
import { hasPinColumns, markPinColumnsUnavailable, missingPinColumn } from './pinColumns'
import { attachSaveCountsFromMap } from './collectionsCore'
import { collectionCoverFetchLimit } from '../constants/library'

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
  collectionCount: number,
): Promise<{ counts: Record<string, number>; coverPool: Record<string, CoverPoolEntry[]> }> {
  const coverLimit = collectionCoverFetchLimit(collectionCount)

  async function runCount(withVault: boolean) {
    let q = supabase
      .from('saves')
      .select('collection_id')
      .not('collection_id', 'is', null)
      .eq('is_inbox', false)
    if (withVault) q = q.eq('is_vault', false)
    return q
  }

  async function runCovers(withVault: boolean) {
    let q = supabase
      .from('saves')
      .select('collection_id, image_url, url, title, description, type, created_at')
      .not('collection_id', 'is', null)
      .eq('is_inbox', false)
      .order('created_at', { ascending: false })
      .limit(coverLimit)
    if (withVault) q = q.eq('is_vault', false)
    return q
  }

  let [countRes, coverRes] = await Promise.all([runCount(true), runCovers(true)])

  if (countRes.error && /is_vault/.test(countRes.error.message)) {
    countRes = await runCount(false)
  }
  if (coverRes.error && /is_vault/.test(coverRes.error.message)) {
    coverRes = await runCovers(false)
  }

  if (countRes.error) throw countRes.error
  if (coverRes.error) throw coverRes.error

  const counts: Record<string, number> = {}
  for (const row of countRes.data ?? []) {
    const id = row.collection_id as string | null
    if (!id) continue
    counts[id] = (counts[id] ?? 0) + 1
  }

  const coverPool: Record<string, CoverPoolEntry[]> = {}
  for (const row of coverRes.data ?? []) {
    const id = row.collection_id as string | null
    if (!id) continue
    const pool = coverPool[id] ?? (coverPool[id] = [])
    if (coverPoolNeedsMore(pool)) {
      pool.push({
        image_url: row.image_url,
        url: row.url,
        title: row.title,
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
  const collections = await fetchCollectionsRows(supabase)
  const meta = await fetchCollectionMeta(supabase, collections.length)

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
  filter: LibraryFilter = 'all',
): Promise<SavesPageResult> {
  if (filter === 'reminders') {
    await ensureRemindersSynced(supabase)
    const ids = listSaveIdsWithUpcomingReminders()
    if (ids.length === 0) return { saves: [], total: 0 }

    const pinOk = await hasPinColumns(supabase)
    let query = supabase
      .from('saves')
      .select('*', { count: 'exact' })
      .eq('collection_id', collectionId)
      .in('id', ids)
    if (pinOk) query = query.order('is_pinned', { ascending: false })
    query = query.order('created_at', { ascending: false })

    let result = await query.eq('is_vault', false).range(offset, offset + limit - 1)

    if (result.error && missingPinColumn(result.error)) {
      markPinColumnsUnavailable()
      query = supabase
        .from('saves')
        .select('*', { count: 'exact' })
        .eq('collection_id', collectionId)
        .in('id', ids)
        .order('created_at', { ascending: false })
      result = await query.eq('is_vault', false).range(offset, offset + limit - 1)
    }

    if (result.error && /is_vault/.test(result.error.message)) {
      query = supabase
        .from('saves')
        .select('*', { count: 'exact' })
        .eq('collection_id', collectionId)
        .in('id', ids)
      if (pinOk) query = query.order('is_pinned', { ascending: false })
      query = query.order('created_at', { ascending: false })
      result = await query.range(offset, offset + limit - 1)
    }

    if (result.error) throw result.error
    return {
      saves: sortByPinnedThenCreated(filterLibrarySaves((result.data ?? []) as Save[])),
      total: result.count ?? 0,
    }
  }

  const pinOk = await hasPinColumns(supabase)

  let query = supabase.from('saves').select('*', { count: 'exact' }).eq('collection_id', collectionId)
  if (pinOk) query = query.order('is_pinned', { ascending: false })
  query = query.order('created_at', { ascending: false })

  if (filter === 'unread') query = query.eq('is_viewed', false)
  else if (filter === 'fav') query = query.eq('is_favorite', true)
  else if (filter === 'github' || filter === 'docs') query = query.or(postgresUrlOrFilter(filter))
  else if (filter !== 'all') query = query.eq('type', filter)

  let result = await query.eq('is_vault', false).range(offset, offset + limit - 1)

  if (result.error && missingPinColumn(result.error)) {
    markPinColumnsUnavailable()
    query = supabase
      .from('saves')
      .select('*', { count: 'exact' })
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
    if (filter === 'unread') query = query.eq('is_viewed', false)
    else if (filter === 'fav') query = query.eq('is_favorite', true)
    else if (filter === 'github' || filter === 'docs') query = query.or(postgresUrlOrFilter(filter))
    else if (filter !== 'all') query = query.eq('type', filter)
    result = await query.eq('is_vault', false).range(offset, offset + limit - 1)
  }

  if (result.error && /is_vault/.test(result.error.message)) {
    query = supabase.from('saves').select('*', { count: 'exact' }).eq('collection_id', collectionId)
    if (pinOk) query = query.order('is_pinned', { ascending: false })
    query = query.order('created_at', { ascending: false })
    if (filter === 'unread') query = query.eq('is_viewed', false)
    else if (filter === 'fav') query = query.eq('is_favorite', true)
    else if (filter === 'github' || filter === 'docs') query = query.or(postgresUrlOrFilter(filter))
    else if (filter !== 'all') query = query.eq('type', filter)
    result = await query.range(offset, offset + limit - 1)
  }

  if (result.error && /is_viewed|is_favorite/.test(result.error.message)) {
    if (filter === 'unread' || filter === 'fav') {
      return { saves: [], total: 0 }
    }
  }

  if (result.error) throw result.error
  return {
    saves: sortByPinnedThenCreated(filterLibrarySaves((result.data ?? []) as Save[])),
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

/** Find or create a non-vault collection by name (Quick Save AI filing). */
export async function upsertCollectionByName(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const existing = await fetchCloudCollections(supabase)
  const match = existing.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
  if (match) return match.id

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: userId,
      name: trimmed,
      icon: 'folder-outline',
      color: '#c0613c',
      is_vault: false,
    })
    .select('id')
    .single()

  if (error) {
    if (/is_vault/.test(error.message)) {
      const fallback = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          name: trimmed,
          icon: 'folder-outline',
          color: '#c0613c',
        })
        .select('id')
        .single()
      if (fallback.error) throw fallback.error
      return fallback.data?.id ?? null
    }
    throw error
  }
  return data?.id ?? null
}
