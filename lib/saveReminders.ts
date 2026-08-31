import type { SupabaseClient } from '@supabase/supabase-js'
import {
  clearReminderHistoryInStore,
  hydrateSaveReminderStore,
  listSaveRemindersFromStore,
  removeUpcomingReminder,
  type StoredSaveReminder,
} from './saveRemindersCore'
import { softDeleteCloudReminder, syncReminderStoreWithCloud } from './reminderCloud'
import { loadReminderStore, saveReminderStore } from './reminderStore'
import { cancelWebReminder } from './webReminderNotifications'

export async function listSaveReminders(
  supabase?: SupabaseClient | null,
): Promise<{ upcoming: StoredSaveReminder[]; history: StoredSaveReminder[] }> {
  if (supabase) {
    await syncReminderStoreWithCloud(supabase)
  }
  const store = hydrateSaveReminderStore(loadReminderStore())
  saveReminderStore(store)
  return listSaveRemindersFromStore(store)
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
