import type { SupabaseClient } from '@supabase/supabase-js'
import type { LibraryStats, Save, SavesPageResult } from './types'
import { filterLibrarySaves } from './libraryCore'

export async function fetchCloudLibrarySavesPage(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
): Promise<SavesPageResult> {
  let result = await supabase
    .from('saves')
    .select('*', { count: 'exact' })
    .eq('is_inbox', false)
    .eq('is_vault', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (result.error && /is_vault/.test(result.error.message)) {
    result = await supabase
      .from('saves')
      .select('*', { count: 'exact' })
      .eq('is_inbox', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  }

  if (result.error) throw result.error
  return {
    saves: filterLibrarySaves((result.data ?? []) as Save[]),
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
  const save = data as Save
  if (save.is_inbox || save.is_vault) return null
  return save
}

/** @deprecated Prefer fetchCloudLibrarySavesPage for library grid. */
export async function fetchCloudLibrarySaves(supabase: SupabaseClient): Promise<Save[]> {
  const { saves } = await fetchCloudLibrarySavesPage(supabase, 0, 500)
  return saves
}

export async function fetchProfileFirstName(supabase: SupabaseClient): Promise<string | undefined> {
  const { data } = await supabase.from('profiles').select('first_name').maybeSingle()
  const name = data?.first_name
  return typeof name === 'string' && name.trim() ? name.trim() : undefined
}
