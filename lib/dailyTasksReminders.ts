import { dateKey } from './dailyTasks'
import { classifyReminderBucket } from './reminderBuckets'
import { normalizeWeekdays, previousReminderOccurrence } from './reminderRepeat'
import type { StoredSaveReminder } from './saveRemindersCore'

function localDayBounds(day: Date): { start: number; end: number } {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  return { start, end: start + 24 * 60 * 60 * 1000 }
}

/** Weekly subsets (e.g. Sun-only) only belong on those weekdays — match mobile. */
export function reminderMatchesDayWeekdays(
  row: Pick<StoredSaveReminder, 'repeat'>,
  day: Date,
): boolean {
  if (row.repeat?.frequency !== 'weekly') return true
  const days = normalizeWeekdays(row.repeat.weekdays, [])
  if (days.length === 0 || days.length >= 7) return true
  return days.includes(day.getDay())
}

/**
 * When mobile fires a repeat, it keeps a local history row for today and advances
 * cloud `fireAt` to the next occurrence (or several, if the device catch-up loop
 * skipped days). Web often only sees that advanced upcoming row (history never
 * synced). Walk previous occurrences until one lands on `day`.
 */
export function synthesizeFiredTodayFromAdvancedRepeat(
  row: StoredSaveReminder,
  day: Date = new Date(),
): StoredSaveReminder | null {
  if (row.deletedAt || row.firedAt || !row.repeat) return null
  if (!reminderMatchesDayWeekdays(row, day)) return null
  const { start, end } = localDayBounds(day)
  const fire = Date.parse(row.fireAt)
  if (!Number.isFinite(fire) || fire < end) return null

  let eventAt = new Date(row.eventAt || row.fireAt)
  if (!Number.isFinite(eventAt.getTime())) return null
  const leadMs = Math.max(0, (row.leadMinutes ?? 0) * 60_000)

  // Everyday catch-up can jump fireAt several days ahead; weekly jumps a week.
  // Walk back until we hit today's window (or pass it).
  for (let guard = 0; guard < 512; guard += 1) {
    const prevEvent = previousReminderOccurrence(eventAt, row.repeat)
    if (!Number.isFinite(prevEvent.getTime()) || prevEvent.getTime() >= eventAt.getTime()) {
      return null
    }
    const prevFire = new Date(prevEvent.getTime() - leadMs)
    if (prevFire.getTime() >= start && prevFire.getTime() < end) {
      return {
        ...row,
        eventAt: prevEvent.toISOString(),
        fireAt: prevFire.toISOString(),
        firedAt: prevFire.toISOString(),
      }
    }
    if (prevFire.getTime() < start) return null
    eventAt = prevEvent
  }
  return null
}

/** Upcoming (and overdue) save reminders that belong on Today's list. */
export function remindersDueToday(
  upcoming: StoredSaveReminder[],
  now: Date = new Date(),
): StoredSaveReminder[] {
  const { start, end } = localDayBounds(now)
  return upcoming
    .filter(row => {
      if (row.deletedAt || row.firedAt) return false
      if (!reminderMatchesDayWeekdays(row, now)) return false
      // Match mobile remindersActiveOnDay: fire before end-of-day, or event on day.
      const fire = Date.parse(row.fireAt)
      const event = Date.parse(row.eventAt)
      if (Number.isFinite(fire) && fire < end) return true
      if (Number.isFinite(event) && event >= start && event < end) return true
      return classifyReminderBucket(row.fireAt, now) === 'today'
    })
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt))
}

/**
 * Same shape as mobile `remindersForTodayList`: due/overdue upcoming + history
 * that already fired today (until the user ticks them off in Done Today).
 * Also synthesizes today's occurrence when cloud advanced a weekly/daily repeat
 * past today without a synced history row (e.g. Water Plants / everyday meds).
 */
export function remindersForTodayList(
  upcoming: StoredSaveReminder[],
  history: StoredSaveReminder[],
  day: Date = new Date(),
): StoredSaveReminder[] {
  const { start, end } = localDayBounds(day)
  const byId = new Map<string, StoredSaveReminder>()

  for (const row of history) {
    if (row.deletedAt) continue
    const fired = Date.parse(row.firedAt ?? row.fireAt)
    if (!Number.isFinite(fired) || fired < start || fired >= end) continue
    byId.set(row.id, row)
  }

  for (const row of upcoming) {
    if (row.deletedAt || byId.has(row.id)) continue
    const synthetic = synthesizeFiredTodayFromAdvancedRepeat(row, day)
    if (synthetic) byId.set(row.id, synthetic)
  }

  for (const row of remindersDueToday(upcoming, day)) {
    const existing = byId.get(row.id)
    if (existing && Date.parse(row.fireAt) !== Date.parse(existing.fireAt)) continue
    byId.set(row.id, row)
  }

  return [...byId.values()].sort((a, b) => a.fireAt.localeCompare(b.fireAt))
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

/**
 * Notifications Reminders list — match mobile: upcoming as-is (no Daily
 * synthesis). Today disappears after ticks via omitRemindersDoneToday.
 */
export function remindersForNotificationsList(
  upcoming: StoredSaveReminder[],
  _history: StoredSaveReminder[] = [],
  _day: Date = new Date(),
): StoredSaveReminder[] {
  return upcoming
    .filter(row => !row.deletedAt)
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt))
}
