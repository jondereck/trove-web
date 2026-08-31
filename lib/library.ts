import type { SupabaseClient } from '@supabase/supabase-js'
import type { Save } from './types'
import { filterLibrarySaves } from './libraryCore'

export async function fetchCloudLibrarySaves(supabase: SupabaseClient): Promise<Save[]> {
  const base = supabase
    .from('saves')
    .select('*')
    .eq('is_inbox', false)
    .order('created_at', { ascending: false })

  const withVault = await base.eq('is_vault', false)
  if (!withVault.error) {
    return filterLibrarySaves((withVault.data ?? []) as Save[])
  }

  if (!/is_vault/.test(withVault.error.message)) {
    throw withVault.error
  }

  const fallback = await supabase
    .from('saves')
    .select('*')
    .eq('is_inbox', false)
    .order('created_at', { ascending: false })

  if (fallback.error) throw fallback.error
  return filterLibrarySaves((fallback.data ?? []) as Save[])
}

export async function fetchProfileFirstName(supabase: SupabaseClient): Promise<string | undefined> {
  const { data } = await supabase.from('profiles').select('first_name').maybeSingle()
  const name = data?.first_name
  return typeof name === 'string' && name.trim() ? name.trim() : undefined
}
