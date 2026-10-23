import type { SupabaseClient } from '@supabase/supabase-js'
import { sortByPinnedThenCreated } from './libraryFilters'
import { hasPinColumns, markPinColumnsUnavailable, missingPinColumn } from './pinColumns'
import { parseSaveRow } from './saves'
import type { Save } from './types'

export const INBOX_CHANGED = 'trove-inbox-changed'

/** Non-vault inbox saves, pinned first, then newest. */
export function selectInboxSaves(saves: Save[]): Save[] {
  return sortByPinnedThenCreated(saves.filter(save => save.is_inbox && !save.is_vault))
}

/** Sidebar badge. Hidden at 0. Matches the mobile tab: 9+ above 9. */
export function inboxCountLabel(count: number): string | null {
  if (count <= 0) return null
  if (count > 9) return '9+'
  return String(count)
}

export function notifyInboxChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(INBOX_CHANGED))
}

export async function fetchCloudInboxSaves(supabase: SupabaseClient): Promise<Save[]> {
  const pinOk = await hasPinColumns(supabase)

  const run = async (withPin: boolean, withVault: boolean) => {
    let query = supabase.from('saves').select('*').eq('is_inbox', true)
    if (withPin) query = query.order('is_pinned', { ascending: false })
    query = query.order('created_at', { ascending: false })
    if (withVault) query = query.eq('is_vault', false)
    return query
  }

  let withPin = pinOk
  let result = await run(withPin, true)

  if (result.error && missingPinColumn(result.error)) {
    markPinColumnsUnavailable()
    withPin = false
    result = await run(false, true)
  }

  if (result.error && /is_vault/.test(result.error.message)) {
    result = await run(withPin, false)
  }

  if (result.error) throw result.error
  return selectInboxSaves((result.data ?? []).map(row => parseSaveRow(row as Save)))
}

export async function fetchCloudInboxCount(supabase: SupabaseClient): Promise<number> {
  const run = (withVault: boolean) => {
    let query = supabase
      .from('saves')
      .select('*', { count: 'exact', head: true })
      .eq('is_inbox', true)
    if (withVault) query = query.eq('is_vault', false)
    return query
  }

  let result = await run(true)
  if (result.error && /is_vault/.test(result.error.message)) {
    result = await run(false)
  }
  if (result.error) throw result.error
  return result.count ?? 0
}
