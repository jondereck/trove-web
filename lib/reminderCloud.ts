import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isCloudSyncableReminder,
  mergeHistoryReminders,
  mergeUpcomingReminders,
  reminderFromCloudRow,
  reminderToCloudRow,
  type CloudReminderRow,
} from './reminderCloudSync'
import {
  loadReminderStore,
  saveReminderStore,
} from './reminderStore'
import type { SaveReminderStore, StoredSaveReminder } from './saveRemindersCore'

let tableAvailable: boolean | null = null

async function hasSaveRemindersTable(supabase: SupabaseClient): Promise<boolean> {
  if (tableAvailable !== null) return tableAvailable
  const { error } = await supabase.from('save_reminders').select('id').limit(1)
  if (!error) {
    tableAvailable = true
    return true
  }
  const message = error.message ?? ''
  if (message.includes('save_reminders') || message.includes('schema cache')) {
    tableAvailable = false
    return false
  }
  tableAvailable = true
  return true
}

export async function fetchCloudReminders(
  supabase: SupabaseClient,
): Promise<StoredSaveReminder[] | null> {
  if (!(await hasSaveRemindersTable(supabase))) return null
  const { data, error } = await supabase.from('save_reminders').select('*')
  if (error) {
    if ((error.message ?? '').includes('save_reminders')) tableAvailable = false
    return null
  }
  return ((data ?? []) as CloudReminderRow[])
    .map(reminderFromCloudRow)
    .filter((row): row is StoredSaveReminder => !!row)
}

export async function upsertCloudReminder(
  supabase: SupabaseClient,
  userId: string,
  row: StoredSaveReminder,
): Promise<boolean> {
  if (!isCloudSyncableReminder(row)) return true
  if (!(await hasSaveRemindersTable(supabase))) return false
  const payload = reminderToCloudRow(
    { ...row, updatedAt: row.updatedAt || new Date().toISOString() },
    userId,
  )
  const { error } = await supabase.from('save_reminders').upsert(payload, { onConflict: 'id' })
  if (error && (error.message ?? '').includes('save_reminders')) tableAvailable = false
  return !error
}

export async function softDeleteCloudReminder(
  supabase: SupabaseClient,
  userId: string,
  row: StoredSaveReminder,
): Promise<boolean> {
  return upsertCloudReminder(supabase, userId, {
    ...row,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function syncReminderStoreWithCloud(
  supabase: SupabaseClient,
): Promise<SaveReminderStore> {
  const local = loadReminderStore()
  const remoteRows = await fetchCloudReminders(supabase)
  if (!remoteRows) return local

  const remote: Record<string, StoredSaveReminder> = {}
  for (const row of remoteRows) remote[row.id] = row

  const merged: SaveReminderStore = {
    upcoming: mergeUpcomingReminders(local.upcoming, remote),
    history: mergeHistoryReminders(local.history, remote, local.historyClearedAt),
    historyClearedAt: local.historyClearedAt,
  }
  saveReminderStore(merged)
  return merged
}

export function storeRemindersForSave(store: SaveReminderStore, saveId: string): StoredSaveReminder[] {
  return Object.values(store.upcoming).filter(
    row => row.saveId === saveId && !row.deletedAt && !row.firedAt,
  )
}
