import { listSaveIdsWithUpcomingReminders } from './libraryReminderFilter'

let cached: Set<string> | null = null
const listeners = new Set<() => void>()

export function invalidateUpcomingReminderIndex(): void {
  cached = null
  listeners.forEach(listener => listener())
}

export function subscribeUpcomingReminderIndex(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getUpcomingReminderSaveIdSet(): ReadonlySet<string> {
  if (cached) return cached
  cached = new Set(listSaveIdsWithUpcomingReminders())
  return cached
}

export function saveHasUpcomingReminder(saveId: string): boolean {
  return getUpcomingReminderSaveIdSet().has(saveId)
}
