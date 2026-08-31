export type ReminderPeriod = 'am' | 'pm'
export type ReminderDateOption = { key: string; label: string; date: Date }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const REMINDER_HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
export const REMINDER_MINUTES = Array.from({ length: 60 }, (_, index) => index)
export const REMINDER_PERIODS: ReminderPeriod[] = ['am', 'pm']

export function buildReminderDateOptions(now: Date, count = 365): ReminderDateOption[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index)
    const label = index === 0
      ? 'Today'
      : `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
    return { key: date.toISOString().slice(0, 10), label, date }
  })
}

export function composeReminderDateTime(
  day: Date,
  hour12: number,
  minute: number,
  period: ReminderPeriod,
): Date {
  const hour = (hour12 % 12) + (period === 'pm' ? 12 : 0)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0)
}

export function formatReminderCountdown(at: Date, now = new Date()): string {
  const delta = at.getTime() - now.getTime()
  if (delta <= 0) return ''
  const totalMinutes = Math.round(delta / 60_000)
  if (totalMinutes < 60) {
    const minutes = Math.max(1, totalMinutes)
    return `Reminds you in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }
  const hours = Math.round(delta / 3_600_000)
  if (hours < 48) return `Reminds you in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  const days = Math.round(delta / 86_400_000)
  return `Reminds you in ${days} ${days === 1 ? 'day' : 'days'}`
}

export function formatReminderRelative(at: Date, now = new Date()): string {
  return formatReminderCountdown(at, now) || 'Choose a future time'
}
