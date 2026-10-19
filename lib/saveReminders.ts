import type { SupabaseClient } from '@supabase/supabase-js'
import {
  advanceCaughtUpRepeatingRows,
  clearReminderHistoryInStore,
  hydrateSaveReminderStore,
  listSaveRemindersFromStore,
  removeUpcomingReminder,
  type StoredSaveReminder,
} from './saveRemindersCore'
import { softDeleteCloudReminder, syncReminderStoreWithCloud, upsertCloudReminder } from './reminderCloud'
import { loadReminderStore, saveReminderStore } from './reminderStore'
import { cancelWebReminder } from './webReminderNotifications'

function persistAdvancedRows(changed: StoredSaveReminder[]): void {
  if (changed.length === 0) return
  const store = hydrateSaveReminderStore(loadReminderStore())
  const upcoming = { ...store.upcoming }
  for (const row of changed) upcoming[row.id] = row
  saveReminderStore(hydrateSaveReminderStore({ ...store, upcoming }))
}

/** Apply catch-up advances (off-day / done repeats) and persist locally. */
export function applyCaughtUpRepeatingReminders(
  upcoming: StoredSaveReminder[],
  doneIds: ReadonlySet<string>,
): StoredSaveReminder[] {
  const { rows, changed } = advanceCaughtUpRepeatingRows(upcoming, doneIds)
  persistAdvancedRows(changed)
  return rows
}

/** Local cache only — no network. Use for first paint. */
export function listSaveRemindersLocal(): {
  upcoming: StoredSaveReminder[]
  history: StoredSaveReminder[]
} {
  const store = hydrateSaveReminderStore(loadReminderStore())
  saveReminderStore(store)
  return listSaveRemindersFromStore(store)
}

export async function listSaveReminders(
  supabase?: SupabaseClient | null,
  options?: { userId?: string | null; doneIds?: ReadonlySet<string> },
): Promise<{ upcoming: StoredSaveReminder[]; history: StoredSaveReminder[] }> {
  if (supabase) {
    await syncReminderStoreWithCloud(supabase)
  }
  const listed = listSaveRemindersLocal()
  const doneIds = options?.doneIds ?? new Set<string>()
  const { rows, changed } = advanceCaughtUpRepeatingRows(listed.upcoming, doneIds)
  persistAdvancedRows(changed)
  if (supabase && options?.userId && changed.length > 0) {
    await Promise.all(
      changed.map(row => upsertCloudReminder(supabase, options.userId!, row).catch(() => false)),
    )
  }
  return { upcoming: rows, history: listed.history }
}

export function clearSaveReminderHistory(): {
  upcoming: StoredSaveReminder[]
  history: StoredSaveReminder[]
} {
  const next = clearReminderHistoryInStore(loadReminderStore())
  saveReminderStore(next)
  return listSaveRemindersFromStore(next)
}

export async function cancelReminder(
  reminderId: string,
  options?: { supabase?: SupabaseClient | null; userId?: string | null; row?: StoredSaveReminder },
): Promise<void> {
  const store = loadReminderStore()
  const existing = store.upcoming[reminderId] ?? options?.row
  const next = hydrateSaveReminderStore(removeUpcomingReminder(store, reminderId))
  saveReminderStore(next)
  cancelWebReminder(reminderId)

  if (options?.supabase && options.userId && existing) {
    const archived = next.history.find(item => item.id === reminderId) ?? {
      ...existing,
      deletedAt: new Date().toISOString(),
      firedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await softDeleteCloudReminder(options.supabase, options.userId, archived)
  }
}
