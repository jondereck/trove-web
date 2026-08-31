import type { SupabaseClient } from '@supabase/supabase-js'
import { postgresUrlOrFilter } from './linkSource'
import { sortByPinnedThenCreated } from './libraryFilters'
import { hasPinColumns, markPinColumnsUnavailable, missingPinColumn } from './pinColumns'
import { parseSaveRow } from './saves'
import type { LibraryFilter, LibraryStats, Save, SavesPageResult } from './types'
import { filterLibrarySaves } from './libraryCore'

function applyLibraryFilter<T extends {
  eq: (col: string, val: unknown) => T
  or: (filters: string) => T
}>(
  query: T,
  filter: LibraryFilter,
): T {
  let q = query.eq('is_inbox', false)
  if (filter === 'unread') return q.eq('is_viewed', false)
  if (filter === 'fav') return q.eq('is_favorite', true)
  if (filter === 'reminders') return q
  if (filter === 'github' || filter === 'docs') return q.or(postgresUrlOrFilter(filter))
  if (filter !== 'all') return q.eq('type', filter)
  return q
}

export async function fetchCloudLibrarySavesPage(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
  filter: LibraryFilter = 'all',
): Promise<SavesPageResult> {
  if (filter === 'reminders') {
    return { saves: [], total: 0 }
  }

  const pinOk = await hasPinColumns(supabase)

  let query = supabase.from('saves').select('*', { count: 'exact' })
  if (pinOk) query = query.order('is_pinned', { ascending: false })
  query = query.order('created_at', { ascending: false })

  query = applyLibraryFilter(query, filter)

  let result = await query.eq('is_vault', false).range(offset, offset + limit - 1)

  if (result.error && missingPinColumn(result.error)) {
    markPinColumnsUnavailable()
    query = supabase.from('saves').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    query = applyLibraryFilter(query, filter)
    result = await query.eq('is_vault', false).range(offset, offset + limit - 1)
  }

  if (result.error && /is_vault/.test(result.error.message)) {
    query = supabase.from('saves').select('*', { count: 'exact' })
    if (pinOk) query = query.order('is_pinned', { ascending: false })
    query = query.order('created_at', { ascending: false })
    query = applyLibraryFilter(query, filter)
    result = await query.range(offset, offset + limit - 1)
  }

  if (result.error && /is_viewed|is_favorite/.test(result.error.message)) {
    if (filter === 'unread' || filter === 'fav') {
      return { saves: [], total: 0 }
    }
  }

  if (result.error) throw result.error
  return {
    saves: sortByPinnedThenCreated(filterLibrarySaves((result.data ?? []).map(parseSaveRow))),
    total: result.count ?? 0,
  }
}

export async function fetchCloudLibraryStats(supabase: SupabaseClient): Promise<LibraryStats> {
  async function countAll(extraType?: Save['type']): Promise<number> {
    let query = supabase
      .from('saves')
      .select('*', { count: 'exact', head: true })
      .eq('is_inbox', false)

    if (extraType) query = query.eq('type', extraType)

    let result = await query.eq('is_vault', false)
    if (result.error && /is_vault/.test(result.error.message)) {
      let fallback = supabase
        .from('saves')
        .select('*', { count: 'exact', head: true })
        .eq('is_inbox', false)
      if (extraType) fallback = fallback.eq('type', extraType)
      result = await fallback
    }

    if (result.error) throw result.error
    return result.count ?? 0
  }

  const [total, notes, links] = await Promise.all([
    countAll(),
    countAll('note'),
    countAll('link'),
  ])

  return { total, notes, links }
}

export async function fetchCloudSaveById(
  supabase: SupabaseClient,
  id: string,
): Promise<Save | null> {
  const { data, error } = await supabase.from('saves').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const save = parseSaveRow(data as Save)
  if (save.is_inbox || save.is_vault) return null
  return save
}

/** @deprecated Prefer fetchCloudLibrarySavesPage for library grid. */
export async function fetchCloudLibrarySaves(supabase: SupabaseClient): Promise<Save[]> {
  const { saves } = await fetchCloudLibrarySavesPage(supabase, 0, 500)
  return saves
}

export async function fetchCloudSavesForStats(supabase: SupabaseClient): Promise<Save[]> {
  const all: Save[] = []
  const pageSize = 500
  let offset = 0

  while (true) {
    const { saves, total } = await fetchCloudLibrarySavesPage(supabase, offset, pageSize, 'all')
    all.push(...saves)
    if (all.length >= total || saves.length < pageSize) break
    offset += pageSize
  }

  return all
}

export async function fetchProfileFirstName(supabase: SupabaseClient): Promise<string | undefined> {
  const { data } = await supabase.from('profiles').select('first_name').maybeSingle()
  const name = data?.first_name
  return typeof name === 'string' && name.trim() ? name.trim() : undefined
}
