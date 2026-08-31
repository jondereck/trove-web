import { hydrateSaveReminderStore } from './saveRemindersCore'
import { loadReminderStore } from './reminderStore'

/** Unique save ids that currently have an upcoming/active scheduled reminder. */
export function listSaveIdsWithUpcomingReminders(): string[] {
  const store = hydrateSaveReminderStore(loadReminderStore())
  const ids = new Set<string>()
  for (const row of Object.values(store.upcoming)) {
    const saveId = row.saveId?.trim()
    if (saveId) ids.add(saveId)
  }
  return Array.from(ids)
}

export function filterSavesByReminderIds<T extends { id: string }>(
  saves: T[],
  reminderSaveIds: readonly string[],
): T[] {
  if (reminderSaveIds.length === 0) return []
  const allowed = new Set(reminderSaveIds)
  return saves.filter(save => allowed.has(save.id))
}
