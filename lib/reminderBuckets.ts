export type ReminderBucketId = 'today' | 'tomorrow' | 'thisWeek' | 'later'

export type ReminderBucket<T extends { fireAt: string }> = {
  id: ReminderBucketId
  label: string
  items: T[]
}

export const REMINDER_BUCKET_META: { id: ReminderBucketId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'later', label: 'Later' },
]

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Monday 00:00 of the week containing `date` (local). */
function startOfWeekMonday(date: Date): Date {
  const start = startOfLocalDay(date)
  const day = start.getDay()
  const offset = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + offset)
  return start
}

export function classifyReminderBucket(
  fireAtIso: string,
  now: Date = new Date(),
): ReminderBucketId {
  const at = new Date(fireAtIso)
  if (!Number.isFinite(at.getTime())) return 'later'

  const startToday = startOfLocalDay(now).getTime()
  const startFire = startOfLocalDay(at).getTime()
  const dayMs = 86_400_000
  const dayDiff = Math.round((startFire - startToday) / dayMs)

  if (dayDiff <= 0) return 'today'
  if (dayDiff === 1) return 'tomorrow'

  const weekStart = startOfWeekMonday(now).getTime()
  const nextWeekStart = weekStart + 7 * dayMs
  if (startFire < nextWeekStart) return 'thisWeek'
  return 'later'
}

/**
 * Hide the occurrence that was ticked in Daily today.
 * Recurring next fires on a *later* day stay (date moves). Same-day rows
 * leave Today even when fireAt strings differ (history vs scheduled ISO).
 */
export function omitRemindersDoneToday<T extends { id: string; fireAt: string }>(
  rows: readonly T[],
  done:
    | ReadonlySet<string>
    | ReadonlyMap<string, string>
    | readonly { id: string; fireAt?: string | null }[],
  now: Date = new Date(),
): T[] {
  const doneFireById = new Map<string, string | null>()
  if (done instanceof Map) {
    for (const [id, fireAt] of done) doneFireById.set(id, fireAt)
  } else if (done instanceof Set) {
    for (const id of done) doneFireById.set(id, null)
  } else {
    for (const entry of done) {
      if (!entry.id) continue
      doneFireById.set(entry.id, entry.fireAt ?? null)
    }
  }
  if (doneFireById.size === 0) return [...rows]
  return rows.filter(row => {
    if (!doneFireById.has(row.id)) return true
    // Still in Today → gone after Daily tick. Later buckets keep the series.
    return classifyReminderBucket(row.fireAt, now) !== 'today'
  })
}

/** Group upcoming reminders into Today / Tomorrow / This week / Later. Empty buckets omitted. */
export function groupUpcomingReminders<T extends { fireAt: string }>(
  rows: readonly T[],
  now: Date = new Date(),
): ReminderBucket<T>[] {
  const buckets: Record<ReminderBucketId, T[]> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  }

  const sorted = [...rows].sort((a, b) => a.fireAt.localeCompare(b.fireAt))
  for (const row of sorted) {
    buckets[classifyReminderBucket(row.fireAt, now)].push(row)
  }

  return REMINDER_BUCKET_META.map(meta => ({
    id: meta.id,
    label: meta.label,
    items: buckets[meta.id],
  })).filter(bucket => bucket.items.length > 0)
}
