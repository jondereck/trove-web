const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly'])

export type ReminderRepeatFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type ReminderRepeatRule = {
  frequency: ReminderRepeatFrequency
  interval: number
  weekdays?: number[]
  monthDay?: number
  month?: number
}

export const REMINDER_REPEAT_MAX_INTERVAL = 99

export function clampReminderInterval(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return 1
  return Math.min(REMINDER_REPEAT_MAX_INTERVAL, Math.max(1, Math.floor(n)))
}

export function reminderRepeatFromDate(
  frequency: ReminderRepeatFrequency,
  interval: number,
  anchor: Date,
): ReminderRepeatRule {
  const rule: ReminderRepeatRule = {
    frequency,
    interval: clampReminderInterval(interval),
  }
  if (frequency === 'weekly') rule.weekdays = [anchor.getDay()]
  if (frequency === 'monthly' || frequency === 'yearly') rule.monthDay = anchor.getDate()
  if (frequency === 'yearly') rule.month = anchor.getMonth()
  return rule
}

export function normalizeWeekdays(value: unknown, fallback: number[]): number[] {
  const raw = Array.isArray(value) ? value : typeof value === 'number' ? [value] : []
  const days = [...new Set(raw.map(n => Number(n)).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))]
  days.sort((a, b) => a - b)
  return days.length ? days : fallback
}

export function toggleRepeatWeekday(rule: ReminderRepeatRule, day: number): ReminderRepeatRule {
  const current = normalizeWeekdays(rule.weekdays, [day])
  if (current.includes(day)) {
    if (current.length === 1) return { ...rule, weekdays: current }
    return { ...rule, weekdays: current.filter(item => item !== day) }
  }
  return { ...rule, weekdays: normalizeWeekdays([...current, day], current) }
}

export function normalizeReminderRepeat(
  value: unknown,
  anchor: Date,
): ReminderRepeatRule | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (!FREQUENCIES.has(String(row.frequency))) return null
  const rule = reminderRepeatFromDate(
    row.frequency as ReminderRepeatFrequency,
    row.interval as number,
    new Date(
      anchor.getFullYear(),
      typeof row.month === 'number' ? row.month : anchor.getMonth(),
      typeof row.monthDay === 'number' ? row.monthDay : anchor.getDate(),
      anchor.getHours(),
      anchor.getMinutes(),
      0,
      0,
    ),
  )
  if (rule.frequency === 'weekly') {
    rule.weekdays = normalizeWeekdays(
      row.weekdays ?? row.weekday,
      rule.weekdays ?? [anchor.getDay()],
    )
  }
  return rule
}

export function nextReminderOccurrence(from: Date, rule: ReminderRepeatRule): Date {
  const interval = clampReminderInterval(rule.interval)
  const hours = from.getHours()
  const minutes = from.getMinutes()
  if (rule.frequency === 'daily') {
    const next = new Date(from)
    next.setDate(next.getDate() + interval)
    return next
  }
  if (rule.frequency === 'weekly') {
    const days = normalizeWeekdays(rule.weekdays, [from.getDay()])
    for (let offset = 1; offset <= 14; offset += 1) {
      const next = new Date(from)
      next.setDate(from.getDate() + offset)
      next.setHours(hours, minutes, 0, 0)
      if (!days.includes(next.getDay())) continue
      if (next.getDay() < from.getDay() || next.getDay() === from.getDay()) {
        next.setDate(next.getDate() + 7 * (interval - 1))
      }
      return next
    }
  }
  if (rule.frequency === 'yearly') {
    const month = rule.month ?? from.getMonth()
    const monthDay = rule.monthDay ?? from.getDate()
    const next = new Date(from.getFullYear() + interval, month, 1, hours, minutes, 0, 0)
    next.setDate(Math.min(monthDay, daysInMonth(next.getFullYear(), month)))
    if (next.getTime() <= from.getTime()) {
      next.setFullYear(next.getFullYear() + interval)
      next.setDate(Math.min(monthDay, daysInMonth(next.getFullYear(), month)))
    }
    return next
  }
  const monthDay = rule.monthDay ?? from.getDate()
  const next = new Date(from.getFullYear(), from.getMonth() + interval, 1, hours, minutes, 0, 0)
  next.setDate(Math.min(monthDay, daysInMonth(next.getFullYear(), next.getMonth())))
  if (next.getTime() <= from.getTime()) {
    next.setMonth(next.getMonth() + interval, 1)
    next.setDate(Math.min(monthDay, daysInMonth(next.getFullYear(), next.getMonth())))
  }
  return next
}

export function nextFutureReminderTimes(input: {
  eventAt: Date
  leadMinutes: number
  repeat: ReminderRepeatRule | null
  now?: Date
}): { eventAt: Date; fireAt: Date } | null {
  const now = input.now ?? new Date()
  const leadMs = Math.max(0, input.leadMinutes) * 60_000
  let eventAt = new Date(input.eventAt.getTime())
  let fireAt = new Date(eventAt.getTime() - leadMs)
  if (fireAt.getTime() > now.getTime()) return { eventAt, fireAt }
  if (!input.repeat) return null
  let guard = 0
  while (fireAt.getTime() <= now.getTime() && guard < 512) {
    eventAt = nextReminderOccurrence(eventAt, input.repeat)
    fireAt = new Date(eventAt.getTime() - leadMs)
    guard += 1
  }
  return fireAt.getTime() > now.getTime() ? { eventAt, fireAt } : null
}

export function formatOrdinal(day: number): string {
  const n = Math.floor(day)
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  if (n % 10 === 1) return `${n}st`
  if (n % 10 === 2) return `${n}nd`
  if (n % 10 === 3) return `${n}rd`
  return `${n}th`
}

export function formatRepeatSummary(rule: ReminderRepeatRule | null, anchor?: Date): string {
  if (!rule) return ''
  const n = clampReminderInterval(rule.interval)
  if (rule.frequency === 'daily') return n === 1 ? 'Every day' : `Every ${n} days`
  if (rule.frequency === 'weekly') {
    const days = normalizeWeekdays(rule.weekdays, [anchor?.getDay() ?? 0])
    const every = n === 1 ? 'Every week' : `Every ${n} weeks`
    if (days.length === 1) return `${every} on ${WEEKDAYS[days[0]!]}`
    const consecutive = days.every((day, index) => index === 0 || day === days[index - 1]! + 1)
    if (consecutive) return `${every} on ${WEEKDAYS[days[0]!]} to ${WEEKDAYS[days[days.length - 1]!]}`
    return `${every} on ${days.map(day => WEEKDAYS[day]!.slice(0, 3)).join(', ')}`
  }
  if (rule.frequency === 'monthly') {
    const day = formatOrdinal(rule.monthDay ?? anchor?.getDate() ?? 1)
    const every = n === 1 ? 'Every month' : `Every ${n} months`
    return `${every} on the ${day}`
  }
  const month = MONTHS_SHORT[rule.month ?? anchor?.getMonth() ?? 0]
  const day = rule.monthDay ?? anchor?.getDate() ?? 1
  const every = n === 1 ? 'Every year' : `Every ${n} years`
  return `${every} on ${month} ${day}`
}

export function formatRepeatCadenceLabel(rule: ReminderRepeatRule): string {
  const n = clampReminderInterval(rule.interval)
  if (rule.frequency === 'daily') return n === 1 ? 'Daily' : `Every ${n} days`
  if (rule.frequency === 'weekly') return n === 1 ? 'Weekly' : `Every ${n} weeks`
  if (rule.frequency === 'monthly') return n === 1 ? 'Monthly' : `Every ${n} months`
  return n === 1 ? 'Yearly' : `Every ${n} years`
}

export function formatRepeatSelectionLabel(
  value: ReminderRepeatRule | null,
  anchor?: Date,
): string {
  if (!value) return "Don't repeat"
  return formatRepeatSummary(value, anchor)
}

export function formatRepeatPill(rule: ReminderRepeatRule, anchor: Date): string | null {
  if (rule.frequency === 'weekly') {
    const days = normalizeWeekdays(rule.weekdays, [anchor.getDay()])
    if (days.length === 1) return `Repeat on ${WEEKDAYS[days[0]!]}`
    return null
  }
  if (rule.frequency === 'monthly') {
    return `Repeat on the ${formatOrdinal(rule.monthDay ?? anchor.getDate())}`
  }
  if (rule.frequency === 'yearly') {
    const month = MONTHS_SHORT[rule.month ?? anchor.getMonth()]
    const day = rule.monthDay ?? anchor.getDate()
    return `Repeat on ${month} ${day}`
  }
  return null
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
