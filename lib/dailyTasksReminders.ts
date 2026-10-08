import { dateKey } from './dailyTasks'
import { classifyReminderBucket } from './reminderBuckets'
import type { StoredSaveReminder } from './saveRemindersCore'

/** Upcoming (and overdue) save reminders that belong on Today's list. */
export function remindersDueToday(
  upcoming: StoredSaveReminder[],
  now: Date = new Date(),
): StoredSaveReminder[] {
  return upcoming
    .filter(row => !row.deletedAt && !row.firedAt && classifyReminderBucket(row.fireAt, now) === 'today')
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt))
}

/** Reminders whose fire day matches a calendar day (agenda). */
export function remindersOnCalendarDay(
  upcoming: StoredSaveReminder[],
  day: Date,
): StoredSaveReminder[] {
  const key = dateKey(day)
  return upcoming
    .filter(row => {
      if (row.deletedAt || row.firedAt) return false
      const at = new Date(row.fireAt)
      return Number.isFinite(at.getTime()) && dateKey(at) === key
    })
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt))
}
