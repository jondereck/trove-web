import { formatReminderCountdown } from './reminderDateTime'
import {
  formatRepeatCadenceLabel,
  nextFutureReminderTimes,
  normalizeReminderRepeat,
  type ReminderRepeatRule,
} from './reminderRepeat'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const SAVE_REMINDER_ID_PREFIX = 'trove.save-reminder.'
export const MAX_SAVE_REMINDER_HISTORY = 50

export type StoredSaveReminder = {
  id: string
  saveId: string
  title: string
  sourceText?: string | null
  eventAt: string
  eventEndAt?: string | null
  fireAt: string
  leadMinutes: number
  firedAt?: string | null
  calendarId?: string | null
  calendarEventId?: string | null
  repeat?: ReminderRepeatRule | null
  updatedAt?: string | null
  deletedAt?: string | null
  /** Vault (and similar) reminders stay on-device and are not synced. */
  localOnly?: boolean
}

export type SaveReminderStore = {
  upcoming: Record<string, StoredSaveReminder>
  history: StoredSaveReminder[]
  /** ISO time of the last History “Clear all”. Older fired/cancelled rows stay hidden. */
  historyClearedAt?: string | null
}

export function legacyReminderId(saveId: string): string {
  return `legacy-${saveId}`
}

export function saveReminderNotificationId(reminderId: string): string {
  return `${SAVE_REMINDER_ID_PREFIX}${reminderId}`
}

/**
 * OS identifiers to cancel for a reminder id. Legacy rows also clear the
 * pre-migration v1 identifier `trove.save-reminder.{saveId}`.
 */
export function notificationIdsToCancelForReminder(reminderId: string): string[] {
  const trimmed = reminderId.trim()
  if (!trimmed) return []
  const ids = [saveReminderNotificationId(trimmed)]
  if (trimmed.startsWith('legacy-')) {
    const saveId = trimmed.slice('legacy-'.length)
    if (saveId) ids.push(saveReminderNotificationId(saveId))
  }
  return ids
}

/** Parses the notification identifier suffix (reminder id or legacy v1 saveId). */
export function saveIdFromNotificationId(identifier: string): string | null {
  if (!identifier.startsWith(SAVE_REMINDER_ID_PREFIX)) return null
  const id = identifier.slice(SAVE_REMINDER_ID_PREFIX.length).trim()
  return id || null
}

/**
 * Dual resolver: try the raw notification token (v2 reminder id), then
 * `legacy-${token}` for in-flight v1 notifications that used saveId as the token.
 */
export function resolveReminderIdFromNotificationToken(
  store: SaveReminderStore,
  token: string,
): string | null {
  const trimmed = token.trim()
  if (!trimmed) return null
  if (store.upcoming[trimmed]) return trimmed
  const legacy = trimmed.startsWith('legacy-') ? trimmed : legacyReminderId(trimmed)
  if (store.upcoming[legacy]) return legacy
  return null
}

export function reminderIsInTheFuture(fireAtIso: string, now = Date.now()): boolean {
  const at = Date.parse(fireAtIso)
  return Number.isFinite(at) && at > now
}

export function formatReminderClock(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  const mm = minutes.toString().padStart(2, '0')
  return `${hour12}:${mm} ${suffix}`
}

export function buildSaveReminderContent(input: {
  saveId: string
  title: string
  fireAt: string
}): {
  title: string
  body: string
  data: { screen: 'save'; saveId: string; fireAt: string }
} {
  const title = input.title.trim() || 'Trove reminder'
  const at = new Date(input.fireAt)
  const clock = Number.isFinite(at.getTime()) ? formatReminderClock(at) : ''
  return {
    title,
    body: clock ? `${title} at ${clock} · Open note` : 'Open this save',
    data: { screen: 'save', saveId: input.saveId, fireAt: input.fireAt },
  }
}

export function laterToday(now: Date): Date {
  const six = new Date(now)
  six.setHours(18, 0, 0, 0)
  if (now.getTime() < six.getTime()) return six
  const later = new Date(now)
  later.setMinutes(0, 0, 0)
  later.setHours(later.getHours() + 3)
  return later
}

export function tomorrowMorning(now: Date): Date {
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(8, 0, 0, 0)
  return next
}

/** Same weekday next week, 8:00 am. */
export function nextWeekMorning(now: Date): Date {
  const next = new Date(now)
  next.setDate(next.getDate() + 7)
  next.setHours(8, 0, 0, 0)
  return next
}

export type ReminderPreset = {
  id: 'later-today' | 'tomorrow-morning' | 'next-week'
  label: string
  fireAt: Date
  clock: string
}

export function reminderPresets(now = new Date()): ReminderPreset[] {
  const later = laterToday(now)
  const tomorrow = tomorrowMorning(now)
  const next = nextWeekMorning(now)
  return [
    { id: 'later-today', label: 'Later today', fireAt: later, clock: formatReminderClock(later) },
    { id: 'tomorrow-morning', label: 'Tomorrow morning', fireAt: tomorrow, clock: formatReminderClock(tomorrow) },
    { id: 'next-week', label: `Next ${WEEKDAYS[next.getDay()]}`, fireAt: next, clock: formatReminderClock(next) },
  ]
}

function emptyStore(): SaveReminderStore {
  return { upcoming: {}, history: [], historyClearedAt: null }
}

export function reminderHistoryStamp(
  row: Pick<StoredSaveReminder, 'firedAt' | 'deletedAt' | 'fireAt'>,
): string {
  return row.firedAt ?? row.deletedAt ?? row.fireAt
}

export function isHistoryHiddenAfterClear(
  row: Pick<StoredSaveReminder, 'firedAt' | 'deletedAt' | 'fireAt'>,
  historyClearedAt: string | null | undefined,
): boolean {
  if (!historyClearedAt) return false
  return reminderHistoryStamp(row) <= historyClearedAt
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asReminder(value: unknown): StoredSaveReminder | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.saveId !== 'string' || !row.saveId) return null
  if (typeof row.fireAt !== 'string' || !Number.isFinite(Date.parse(row.fireAt))) return null

  const id =
    typeof row.id === 'string' && row.id
      ? row.id
      : legacyReminderId(row.saveId)
  const eventAt =
    typeof row.eventAt === 'string' && Number.isFinite(Date.parse(row.eventAt))
      ? row.eventAt
      : row.fireAt
  const leadMinutes =
    typeof row.leadMinutes === 'number' && Number.isFinite(row.leadMinutes)
      ? row.leadMinutes
      : 0
  const anchor = new Date(eventAt)
  const repeat = normalizeReminderRepeat(
    row.repeat,
    Number.isFinite(anchor.getTime()) ? anchor : new Date(),
  )

  return {
    id,
    saveId: row.saveId,
    title: typeof row.title === 'string' ? row.title : '',
    sourceText: optionalString(row.sourceText),
    eventAt,
    eventEndAt: optionalString(row.eventEndAt),
    fireAt: row.fireAt,
    leadMinutes,
    firedAt: typeof row.firedAt === 'string' ? row.firedAt : null,
    calendarId: optionalString(row.calendarId),
    calendarEventId: optionalString(row.calendarEventId),
    repeat,
    updatedAt: optionalString(row.updatedAt),
    deletedAt: optionalString(row.deletedAt),
    localOnly: row.localOnly === true,
  }
}

export function parseSaveReminderStore(raw: unknown, now = Date.now()): SaveReminderStore {
  if (!raw || typeof raw !== 'object') return emptyStore()
  const obj = raw as Record<string, unknown>
  const historyClearedAt =
    typeof obj.historyClearedAt === 'string' && obj.historyClearedAt
      ? obj.historyClearedAt
      : null
  if (obj.upcoming && typeof obj.upcoming === 'object' && !Array.isArray(obj.upcoming)) {
    const upcoming: Record<string, StoredSaveReminder> = {}
    Object.values(obj.upcoming as Record<string, unknown>).forEach(value => {
      const row = asReminder(value)
      if (row) upcoming[row.id] = row
    })
    const history = Array.isArray(obj.history)
      ? obj.history.map(asReminder).filter((row): row is StoredSaveReminder => !!row)
      : []
    return hydrateSaveReminderStore({ upcoming, history, historyClearedAt }, now)
  }

  const upcoming: Record<string, StoredSaveReminder> = {}
  Object.values(obj).forEach(value => {
    const row = asReminder(value)
    if (row) upcoming[row.id] = row
  })
  return hydrateSaveReminderStore({ upcoming, history: [], historyClearedAt }, now)
}

function withHistoryMeta(
  store: SaveReminderStore,
  parts: { upcoming: Record<string, StoredSaveReminder>; history: StoredSaveReminder[] },
): SaveReminderStore {
  return { ...parts, historyClearedAt: store.historyClearedAt ?? null }
}

function reminderHistoryKey(row: StoredSaveReminder): string {
  return `${row.id}|${row.eventAt}`
}

function dedupeReminderHistory(history: StoredSaveReminder[]): StoredSaveReminder[] {
  const seen = new Set<string>()
  const next: StoredSaveReminder[] = []
  for (const row of history) {
    const key = reminderHistoryKey(row)
    if (seen.has(key)) continue
    seen.add(key)
    next.push(row)
  }
  return next
}

function pushHistory(
  history: StoredSaveReminder[],
  keys: Set<string>,
  row: StoredSaveReminder,
  historyClearedAt: string | null | undefined,
): void {
  const archived = { ...row, firedAt: row.firedAt ?? row.fireAt }
  if (isHistoryHiddenAfterClear(archived, historyClearedAt)) return
  const key = reminderHistoryKey(archived)
  if (keys.has(key)) return
  keys.add(key)
  history.push(archived)
}

export function hydrateSaveReminderStore(store: SaveReminderStore, now = Date.now()): SaveReminderStore {
  const historyClearedAt = store.historyClearedAt ?? null
  const upcoming: Record<string, StoredSaveReminder> = {}
  const history = store.history.filter(row => !isHistoryHiddenAfterClear(row, historyClearedAt))
  const historyKeys = new Set(history.map(reminderHistoryKey))
  Object.values(store.upcoming).forEach(row => {
    const normalized = asReminder(row) ?? row
    if (normalized.deletedAt) return
    if (!normalized.firedAt && reminderIsInTheFuture(normalized.fireAt, now)) {
      upcoming[normalized.id] = { ...normalized, firedAt: null }
      return
    }
    if (normalized.repeat) {
      const times = nextFutureReminderTimes({
        eventAt: new Date(normalized.eventAt),
        leadMinutes: normalized.leadMinutes,
        repeat: normalized.repeat,
        now: new Date(now),
      })
      if (times) {
        upcoming[normalized.id] = {
          ...normalized,
          eventAt: times.eventAt.toISOString(),
          fireAt: times.fireAt.toISOString(),
          firedAt: null,
        }
        pushHistory(history, historyKeys, normalized, historyClearedAt)
        return
      }
    }
    pushHistory(history, historyKeys, normalized, historyClearedAt)
  })
  history.sort((a, b) => (b.firedAt ?? b.fireAt).localeCompare(a.firedAt ?? a.fireAt))
  return {
    upcoming,
    history: dedupeReminderHistory(history).slice(0, MAX_SAVE_REMINDER_HISTORY),
    historyClearedAt,
  }
}

export function clearReminderHistoryInStore(
  store: SaveReminderStore,
  now = Date.now(),
): SaveReminderStore {
  return hydrateSaveReminderStore({
    upcoming: store.upcoming,
    history: [],
    historyClearedAt: new Date(now).toISOString(),
  }, now)
}

export function markReminderFiredInStore(
  store: SaveReminderStore,
  reminderId: string,
  firedAtIso: string,
  now = Date.parse(firedAtIso) || Date.now(),
): SaveReminderStore {
  const row = store.upcoming[reminderId]
  if (!row) return hydrateSaveReminderStore(store, now)
  const upcoming = { ...store.upcoming }
  delete upcoming[reminderId]
  if (row.repeat) {
    const times = nextFutureReminderTimes({
      eventAt: new Date(row.eventAt),
      leadMinutes: row.leadMinutes,
      repeat: row.repeat,
      now: new Date(now),
    })
    if (times) {
      upcoming[row.id] = {
        ...row,
        eventAt: times.eventAt.toISOString(),
        fireAt: times.fireAt.toISOString(),
        firedAt: null,
      }
    }
  }
  return hydrateSaveReminderStore(withHistoryMeta(store, {
    upcoming,
    history: [{ ...row, firedAt: firedAtIso }, ...store.history],
  }), now)
}

export function upsertUpcomingReminder(
  store: SaveReminderStore,
  row: StoredSaveReminder,
  now = Date.now(),
): SaveReminderStore {
  const normalized = asReminder(row) ?? row
  return hydrateSaveReminderStore(withHistoryMeta(store, {
    upcoming: { ...store.upcoming, [normalized.id]: { ...normalized, firedAt: null } },
    history: store.history,
  }), now)
}

export function preserveCalendarLinkage(
  next: StoredSaveReminder,
  previous: StoredSaveReminder | undefined | null,
): StoredSaveReminder {
  if (!previous?.calendarEventId) return next
  return {
    ...next,
    calendarId: next.calendarId ?? previous.calendarId,
    calendarEventId: next.calendarEventId ?? previous.calendarEventId,
  }
}

export function patchReminderInStore(
  store: SaveReminderStore,
  reminderId: string,
  patch: Partial<StoredSaveReminder>,
  now = Date.now(),
): SaveReminderStore {
  const current = store.upcoming[reminderId]
  if (!current) return store
  return hydrateSaveReminderStore(withHistoryMeta(store, {
    upcoming: {
      ...store.upcoming,
      [reminderId]: {
        ...current,
        ...patch,
        id: current.id,
        saveId: current.saveId,
      },
    },
    history: store.history,
  }), now)
}

export function cancelUpcomingReminderInStore(
  store: SaveReminderStore,
  reminderId: string,
  now = Date.now(),
): SaveReminderStore {
  const row = store.upcoming[reminderId]
  if (!row) return hydrateSaveReminderStore(store, now)
  const upcoming = { ...store.upcoming }
  delete upcoming[reminderId]
  const cancelledAt = new Date(now).toISOString()
  const archived: StoredSaveReminder = {
    ...row,
    deletedAt: cancelledAt,
    firedAt: cancelledAt,
    updatedAt: cancelledAt,
  }
  return hydrateSaveReminderStore(withHistoryMeta(store, {
    upcoming,
    history: [archived, ...store.history],
  }), now)
}

/** Cancel removes from Upcoming and archives into History so both lists stay in sync. */
export function removeUpcomingReminder(
  store: SaveReminderStore,
  reminderId: string,
  now = Date.now(),
): SaveReminderStore {
  return cancelUpcomingReminderInStore(store, reminderId, now)
}

export function listRemindersForSaveFromStore(
  store: SaveReminderStore,
  saveId: string,
  now = Date.now(),
): StoredSaveReminder[] {
  const hydrated = hydrateSaveReminderStore(store, now)
  return Object.values(hydrated.upcoming)
    .filter(row => row.saveId === saveId)
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt))
}

export function removeAllUpcomingForSave(
  store: SaveReminderStore,
  saveId: string,
  now = Date.now(),
): SaveReminderStore {
  const cancelledAt = new Date(now).toISOString()
  const upcoming: Record<string, StoredSaveReminder> = {}
  const archived: StoredSaveReminder[] = []
  Object.values(store.upcoming).forEach(row => {
    if (row.saveId !== saveId) {
      upcoming[row.id] = row
      return
    }
    archived.push({
      ...row,
      deletedAt: cancelledAt,
      firedAt: cancelledAt,
      updatedAt: cancelledAt,
    })
  })
  return hydrateSaveReminderStore(withHistoryMeta(store, {
    upcoming,
    history: [...archived, ...store.history],
  }), now)
}

export function listSaveRemindersFromStore(store: SaveReminderStore, now = Date.now()): {
  upcoming: StoredSaveReminder[]
  history: StoredSaveReminder[]
} {
  const hydrated = hydrateSaveReminderStore(store, now)
  return {
    upcoming: Object.values(hydrated.upcoming).sort((a, b) => a.fireAt.localeCompare(b.fireAt)),
    history: hydrated.history,
  }
}

export function reminderDisplayTitle(row: StoredSaveReminder, liveTitle?: string | null): string {
  const stored = row.title.trim()
  if (stored) return stored
  const live = liveTitle?.trim()
  if (live) return live
  return 'Trove reminder'
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatUpcomingWhen(fireAtIso: string, now = new Date()): string {
  return formatEventWhen(fireAtIso, null, now)
}

export function formatEventWhen(
  eventAtIso: string,
  eventEndAtIso?: string | null,
  now = new Date(),
): string {
  const at = new Date(eventAtIso)
  if (!Number.isFinite(at.getTime())) return ''
  const clock = formatEventClock(at, eventEndAtIso)
  const dayDiff = Math.round((startOfLocalDay(at) - startOfLocalDay(now)) / 86_400_000)
  if (dayDiff === 0) return `Today · ${clock}`
  if (dayDiff === 1) return `Tomorrow · ${clock}`
  return `${WEEKDAYS_SHORT[at.getDay()]}, ${MONTHS_SHORT[at.getMonth()]} ${at.getDate()} · ${clock}`
}

function formatEventClock(start: Date, eventEndAtIso?: string | null): string {
  const startClock = formatReminderClock(start)
  if (!eventEndAtIso) return startClock
  const end = new Date(eventEndAtIso)
  if (!Number.isFinite(end.getTime()) || end.getTime() <= start.getTime()) return startClock
  return `${startClock} – ${formatReminderClock(end)}`
}

export function formatNextRunIn(fireAtIso: string, now = new Date()): string {
  const at = new Date(fireAtIso)
  if (!Number.isFinite(at.getTime())) return ''
  const delta = at.getTime() - now.getTime()
  if (delta <= 0) return ''
  const totalMinutes = Math.round(delta / 60_000)
  if (totalMinutes < 60) {
    const minutes = Math.max(1, totalMinutes)
    return `Next run in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }
  const hours = Math.round(delta / 3_600_000)
  if (hours < 48) return `Next run in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  const days = Math.round(delta / 86_400_000)
  return `Next run in ${days} ${days === 1 ? 'day' : 'days'}`
}

export function formatUpcomingReminderSubtitle(
  row: Pick<StoredSaveReminder, 'fireAt' | 'repeat'>,
  now = new Date(),
): string {
  const nextRun = formatNextRunIn(row.fireAt, now)
  if (row.repeat) {
    const cadence = formatRepeatCadenceLabel(row.repeat)
    return nextRun ? `${cadence} • ${nextRun}` : cadence
  }
  if (nextRun) return nextRun
  return formatUpcomingWhen(row.fireAt, now)
}

export function formatReminderScheduleLabels(
  row: Pick<StoredSaveReminder, 'eventAt' | 'fireAt'>,
  now = new Date(),
): { event?: string; reminds: string; repeat?: string } {
  const fireAt = new Date(row.fireAt)
  const when = formatUpcomingWhen(row.fireAt, now)
  const countdown = Number.isFinite(fireAt.getTime()) ? formatReminderCountdown(fireAt, now) : ''
  const reminds = countdown ? `${countdown} · ${when}` : when
  const eventMs = Date.parse(row.eventAt)
  const fireMs = Date.parse(row.fireAt)
  if (!Number.isFinite(eventMs) || !Number.isFinite(fireMs) || eventMs === fireMs) {
    return { reminds }
  }
  return {
    event: `Event ${formatUpcomingWhen(row.eventAt, now)}`,
    reminds,
  }
}

export function formatHistoryWhen(firedAtIso: string): string {
  const at = new Date(firedAtIso)
  if (!Number.isFinite(at.getTime())) return 'Reminded'
  return `Reminded ${WEEKDAYS_SHORT[at.getDay()]} ${formatReminderClock(at)}`
}

export function formatHistorySubtitle(row: StoredSaveReminder): string {
  if (row.deletedAt) {
    const at = new Date(row.deletedAt)
    if (!Number.isFinite(at.getTime())) return 'Cancelled'
    return `Cancelled ${WEEKDAYS_SHORT[at.getDay()]} ${formatReminderClock(at)}`
  }
  return formatHistoryWhen(row.firedAt ?? row.fireAt)
}

export function isCancelledReminder(row: StoredSaveReminder): boolean {
  return !!row.deletedAt
}

export function formatCurrentReminder(fireAtIso: string, now = new Date()): string {
  const at = new Date(fireAtIso)
  if (!Number.isFinite(at.getTime())) return ''
  const when = `${WEEKDAYS[at.getDay()]}, ${formatReminderClock(at)}`
  const countdown = formatReminderCountdown(at, now)
  return countdown ? `${countdown} · ${when}` : `Currently ${when}`
}
