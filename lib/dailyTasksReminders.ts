import { dateKey } from './dailyTasks'
import { classifyReminderBucket } from './reminderBuckets'
import { previousReminderOccurrence } from './reminderRepeat'
import type { StoredSaveReminder } from './saveRemindersCore'

function localDayBounds(day: Date): { start: number; end: number } {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  return { start, end: start + 24 * 60 * 60 * 1000 }
}

/**
 * When mobile fires a repeat, it keeps a local history row for today and advances
 * cloud `fireAt` to the next occurrence. Web often only sees that advanced upcoming
 * row (history never synced). Synthesize today's occurrence so Daily Tasks still
 * lists it until the user ticks it off.
 */
export function synthesizeFiredTodayFromAdvancedRepeat(
  row: StoredSaveReminder,
  day: Date = new Date(),
): StoredSaveReminder | null {
  if (row.deletedAt || row.firedAt || !row.repeat) return null
  const { start, end } = localDayBounds(day)
  const fire = Date.parse(row.fireAt)
  if (!Number.isFinite(fire) || fire < end) return null

  const eventAt = new Date(row.eventAt || row.fireAt)
  if (!Number.isFinite(eventAt.getTime())) return null
  const leadMs = Math.max(0, (row.leadMinutes ?? 0) * 60_000)
  const prevEvent = previousReminderOccurrence(eventAt, row.repeat)
  const prevFire = new Date(prevEvent.getTime() - leadMs)
  if (prevFire.getTime() < start || prevFire.getTime() >= end) return null

  return {
    ...row,
    eventAt: prevEvent.toISOString(),
    fireAt: prevFire.toISOString(),
    firedAt: prevFire.toISOString(),
  }
}

/** Upcoming (and overdue) save reminders that belong on Today's list. */
export function remindersDueToday(
  upcoming: StoredSaveReminder[],
  now: Date = new Date(),
): StoredSaveReminder[] {
  return upcoming
    .filter(row => !row.deletedAt && !row.firedAt && classifyReminderBucket(row.fireAt, now) === 'today')
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt))
}

/**
 * Same shape as mobile `remindersForTodayList`: due/overdue upcoming + history
 * that already fired today (until the user ticks them off in Done Today).
 * Also synthesizes today's occurrence when cloud advanced a weekly/daily repeat
 * past today without a synced history row (e.g. Water Plants).
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
 * Upcoming list for Notifications: keep open "today" occurrences (even when
 * cloud already advanced fireAt) so Reminders → Today matches Daily Tasks /
 * mobile until the user ticks them off.
 */
export function remindersForNotificationsList(
  upcoming: StoredSaveReminder[],
  history: StoredSaveReminder[],
  day: Date = new Date(),
): StoredSaveReminder[] {
  const byId = new Map<string, StoredSaveReminder>()
  for (const row of upcoming) {
    if (row.deletedAt) continue
    byId.set(row.id, row)
  }
  for (const row of remindersForTodayList(upcoming, history, day)) {
    byId.set(row.id, { ...row, firedAt: null })
  }
  return [...byId.values()].sort((a, b) => a.fireAt.localeCompare(b.fireAt))
}
