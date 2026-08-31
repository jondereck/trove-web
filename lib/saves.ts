import type { SupabaseClient } from '@supabase/supabase-js'
import { hasPinColumns, markPinColumnsUnavailable, missingPinColumn } from './pinColumns'
import { shouldBumpUpdatedAt } from './saveTimestamps'
import type { Save, SaveUpdate } from './types'
import { hydrateSave } from './saveDetailCore'

function stripMissingColumn(
  payload: Record<string, unknown>,
  error: { message?: string },
): Record<string, unknown> | null {
  const message = error.message ?? ''
  const next = { ...payload }
  let changed = false
  for (const key of Object.keys(next)) {
    if (message.includes(key)) {
      delete next[key]
      changed = true
    }
  }
  return changed && Object.keys(next).length > 0 ? next : null
}

export async function updateSave(
  supabase: SupabaseClient,
  id: string,
  updates: SaveUpdate,
  opts?: { bump?: boolean },
): Promise<boolean> {
  let payload: Record<string, unknown> = { ...updates }
  if (shouldBumpUpdatedAt(payload, opts)) {
    payload.updated_at = new Date().toISOString()
  }
  if (Object.keys(payload).length === 0) return false

  let { error } = await supabase.from('saves').update(payload).eq('id', id)

  for (let retry = 0; error && retry < 4; retry++) {
    if (missingPinColumn(error) && 'is_pinned' in updates) {
      markPinColumnsUnavailable()
      const { is_pinned: _, ...rest } = updates
      payload = { ...rest }
      if (shouldBumpUpdatedAt(payload, opts)) {
        payload.updated_at = new Date().toISOString()
      }
      ;({ error } = await supabase.from('saves').update(payload).eq('id', id))
      continue
    }
    const nextPayload = stripMissingColumn(payload, error)
    if (!nextPayload) break
    payload = nextPayload
    ;({ error } = await supabase.from('saves').update(payload).eq('id', id))
  }

  return !error
}

export async function deleteSave(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await supabase.from('saves').delete().eq('id', id)
  return !error
}

export function parseSaveRow(row: Save): Save {
  return hydrateSave(row)
}
