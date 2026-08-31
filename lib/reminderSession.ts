import type { SupabaseClient } from '@supabase/supabase-js'
import { syncReminderStoreWithCloud } from './reminderCloud'
import { rescheduleWebReminders } from './webReminderNotifications'
import { invalidateUpcomingReminderIndex } from './upcomingReminderIndex'
import type { SaveReminderStore } from './saveRemindersCore'

let syncPromise: Promise<SaveReminderStore> | null = null

export function ensureRemindersSynced(supabase: SupabaseClient): Promise<SaveReminderStore> {
  if (!syncPromise) {
    syncPromise = syncReminderStoreWithCloud(supabase).then(store => {
      rescheduleWebReminders(store)
      invalidateUpcomingReminderIndex()
      return store
    })
  }
  return syncPromise
}

export function resetReminderSync(): void {
  syncPromise = null
}
