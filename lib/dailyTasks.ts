// Pure helpers + types for the Daily Tasks ("Today") feature.
//
// Open tasks live in `tasks` until the user completes them. Completing a task
// removes it from the active list and archives it in `completed` (history).
// Incomplete tasks carry across days and keep reminding until done. Keep this
// module pure (no expo / native imports) so it runs under `tsx --test`.

import { applyReminderClock, formatReminderClock } from './reminderDateTime'

export type DailyTask = {
  id: string
  title: string
  /** 0-23, or null for an all-day task ("Throughout the day"). */
  hour: number | null
  /** 0-59, or null when `hour` is null. */
  minute: number | null
  /** 0-6 (Sun-Sat). Omitted / empty means remind every day until done. */
  weekdays?: number[]
  sortOrder: number
  createdAt: string
  updatedAt: string
  /** Local YYYY-MM-DD this occurrence is due. Missing on older rows means today at read time. */
  scheduledOn?: string
}

/** Archived when the user checks a task off — leaves the active list. */
export type CompletedDailyTask = {
  id: string
  title: string
  /** Local YYYY-MM-DD when completed. */
  completedOn: string
  completedAt: string
  hour?: number | null
  minute?: number | null
  weekdays?: number[]
  /** Origin — reminder rows can be restored back to save reminders. */
  source?: 'task' | 'reminder'
  saveId?: string
  reminderId?: string
  /** Snapshot of the reminder fire time for restore. */
  fireAt?: string
  eventAt?: string
  /** Repeating series this archive belongs to. The open task keeps `seriesId` as its id. */
  seriesId?: string
}

export type DailyTasksState = {
  /** Master toggle (Off state when false). */
  enabled: boolean
  /** Daily summary notification toggle. */
  summaryEnabled: boolean
  summaryHour: number
  summaryMinute: number
  /** Open / incomplete tasks (carry across days until completed). */
  tasks: DailyTask[]
  /** Newest-first archive of completed tasks. */
  completed: CompletedDailyTask[]
  /** Local YYYY-MM-DD -> completed task ids that day (agenda / streak). */
  history: Record<string, string[]>
  /**
   * Days the user had at least one open task (carryover or newly added).
   * Used by streak: empty days with no obligation are skipped (don't break);
   * obligation days with 0 completions break the streak.
   */
  obligationDays: Record<string, true>
  /** ISO timestamp for cloud LWW merge (bumped on every local write). */
  updatedAt?: string
}

export type NewDailyTaskInput = {
  title: string
  hour?: number | null
  minute?: number | null
  weekdays?: number[]
  /** Local YYYY-MM-DD. Defaults to today. */
  scheduledOn?: string
}

/** Keep on-device history small; ~1 year is plenty for streaks/agenda. */
export const MAX_HISTORY_DAYS = 366
export const MAX_COMPLETED = 500
export const DEFAULT_SUMMARY_HOUR = 8
export const DEFAULT_SUMMARY_MINUTE = 0

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Day keys ─────────────────────────────────────────────────────────────────

export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now)
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, delta: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + delta)
  return next
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1)
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_KEY.test(value)
}

/** Weekday subset repeats. All seven / omitted is a one-shot on `scheduledOn`. */
export function isRepeatingTask(task: Pick<DailyTask, 'weekdays'>): boolean {
  return !!task.weekdays && task.weekdays.length > 0 && task.weekdays.length < 7
}

export function taskScheduledKey(task: Pick<DailyTask, 'scheduledOn'>, now: Date = new Date()): string {
  return isDateKey(task.scheduledOn) ? task.scheduledOn : todayKey(now)
}

/** Next matching weekday strictly after `after`, or the same key for a one-shot. */
export function nextOccurrenceKey(task: Pick<DailyTask, 'weekdays' | 'scheduledOn'>, after: Date): string {
  if (!isRepeatingTask(task)) return taskScheduledKey(task, after)
  const start = addDays(after, 1)
  for (let i = 0; i < 14; i += 1) {
    const day = addDays(start, i)
    if (task.weekdays!.includes(day.getDay())) return dateKey(day)
  }
  return dateKey(start)
}

/** If a repeating task is placed on a weekday it doesn't include, snap forward. */
export function alignScheduledOn(scheduledOn: string, weekdays?: number[]): string {
  if (!isDateKey(scheduledOn)) return scheduledOn
  if (!weekdays || weekdays.length === 0 || weekdays.length >= 7) return scheduledOn
  const start = parseDateKey(scheduledOn)
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(start, i)
    if (weekdays.includes(day.getDay())) return dateKey(day)
  }
  return scheduledOn
}

// ── State factory + parsing ──────────────────────────────────────────────────

export function emptyDailyTasksState(): DailyTasksState {
  return {
    enabled: false,
    summaryEnabled: false,
    summaryHour: DEFAULT_SUMMARY_HOUR,
    summaryMinute: DEFAULT_SUMMARY_MINUTE,
    tasks: [],
    completed: [],
    history: {},
    obligationDays: {},
  }
}

function toClockHour(value: unknown): number | null {
  const n = typeof value === 'number' ? Math.floor(value) : Number.NaN
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : null
}

function toClockMinute(value: unknown): number {
  const n = typeof value === 'number' ? Math.floor(value) : Number.NaN
  return Number.isInteger(n) && n >= 0 && n <= 59 ? n : 0
}

export function normalizeWeekdays(value: unknown): number[] | undefined {
  const raw = Array.isArray(value) ? value : []
  const days = [...new Set(raw.map(n => Number(n)).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))]
  days.sort((a, b) => a - b)
  return days.length === 0 || days.length === 7 ? undefined : days
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((v): v is string => typeof v === 'string' && !!v))]
}

function normalizeTask(value: unknown, index: number): DailyTask | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title.trim() : ''
  if (!title) return null
  // Legacy habit model stored completedOn on the task — those are already "done"
  // for that day; drop them from the open list (they're migrated into completed).
  if (typeof row.completedOn === 'string' && row.completedOn) return null
  const id =
    typeof row.id === 'string' && row.id
      ? row.id
      : `dt-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
  const hour = toClockHour(row.hour)
  const minute = hour == null ? null : toClockMinute(row.minute)
  const nowIso = new Date().toISOString()
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : nowIso
  const task: DailyTask = {
    id,
    title,
    hour,
    minute,
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : index,
    createdAt,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : createdAt,
  }
  const weekdays = normalizeWeekdays(row.weekdays)
  if (weekdays) task.weekdays = weekdays
  const scheduledOn = isDateKey(row.scheduledOn)
    ? row.scheduledOn
    : dateKey(new Date(createdAt))
  task.scheduledOn = alignScheduledOn(
    isDateKey(scheduledOn) ? scheduledOn : todayKey(),
    weekdays,
  )
  return task
}

function normalizeCompletedEntry(value: unknown): CompletedDailyTask | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title.trim() : ''
  const completedOn = typeof row.completedOn === 'string' ? row.completedOn : ''
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(completedOn)) return null
  const id =
    typeof row.id === 'string' && row.id
      ? row.id
      : `dt-done-${completedOn}-${Math.random().toString(36).slice(2, 8)}`
  const completedAt =
    typeof row.completedAt === 'string' ? row.completedAt : `${completedOn}T12:00:00.000Z`
  const entry: CompletedDailyTask = { id, title, completedOn, completedAt }
  if ('hour' in row) entry.hour = toClockHour(row.hour)
  if ('minute' in row) entry.minute = entry.hour == null ? null : toClockMinute(row.minute)
  const weekdays = normalizeWeekdays(row.weekdays)
  if (weekdays) entry.weekdays = weekdays
  if (row.source === 'reminder') {
    entry.source = 'reminder'
    if (typeof row.saveId === 'string' && row.saveId) entry.saveId = row.saveId
    if (typeof row.reminderId === 'string' && row.reminderId) entry.reminderId = row.reminderId
    if (typeof row.fireAt === 'string') entry.fireAt = row.fireAt
    if (typeof row.eventAt === 'string') entry.eventAt = row.eventAt
  } else if (row.source === 'task') {
    entry.source = 'task'
  }
  if (typeof row.seriesId === 'string' && row.seriesId) entry.seriesId = row.seriesId
  return entry
}

/** Pull legacy tasks that had completedOn into the completed archive. */
function migrateLegacyCompleted(rawTasks: unknown[]): CompletedDailyTask[] {
  if (!Array.isArray(rawTasks)) return []
  const out: CompletedDailyTask[] = []
  for (const value of rawTasks) {
    if (!value || typeof value !== 'object') continue
    const row = value as Record<string, unknown>
    const completedOn = typeof row.completedOn === 'string' ? row.completedOn : ''
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    if (!completedOn || !title) continue
    const id = typeof row.id === 'string' && row.id ? row.id : `dt-done-${completedOn}`
    out.push({
      id,
      title,
      completedOn,
      completedAt: typeof row.updatedAt === 'string' ? row.updatedAt : `${completedOn}T12:00:00.000Z`,
      hour: toClockHour(row.hour),
      minute: toClockHour(row.hour) == null ? null : toClockMinute(row.minute),
    })
  }
  return out
}

function normalizeHistory(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    const list = normalizeStringArray(ids)
    if (list.length) out[key] = list
  }
  return out
}

function rebuildHistoryFromCompleted(completed: CompletedDailyTask[]): Record<string, string[]> {
  const history: Record<string, string[]> = {}
  for (const entry of completed) {
    const list = history[entry.completedOn] ?? []
    if (!list.includes(entry.id)) list.push(entry.id)
    history[entry.completedOn] = list
  }
  return trimHistoryDays(history)
}

function trimHistoryDays(history: Record<string, string[]>): Record<string, string[]> {
  const keys = Object.keys(history).sort()
  if (keys.length <= MAX_HISTORY_DAYS) return history
  const keep = new Set(keys.slice(-MAX_HISTORY_DAYS))
  const out: Record<string, string[]> = {}
  for (const key of keys) if (keep.has(key)) out[key] = history[key]!
  return out
}

function normalizeObligationDays(value: unknown): Record<string, true> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, true> = {}
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) out[key] = true
  }
  return trimObligationDays(out)
}

function trimObligationDays(days: Record<string, true>): Record<string, true> {
  const keys = Object.keys(days).sort()
  if (keys.length <= MAX_HISTORY_DAYS) return days
  const keep = new Set(keys.slice(-MAX_HISTORY_DAYS))
  const out: Record<string, true> = {}
  for (const key of keys) if (keep.has(key)) out[key] = true
  return out
}

/**
 * Mark today as a day the user had open work. Call whenever open tasks exist
 * (add, carryover on app open, etc.) so streak can skip empty no-task days.
 */
export function markObligationDay(
  state: DailyTasksState,
  now: Date = new Date(),
): DailyTasksState {
  const key = todayKey(now)
  const hasWorkToday = state.tasks.some(task => taskScheduledKey(task, now) <= key)
  if (!hasWorkToday) return state
  if (state.obligationDays[key]) return state
  return {
    ...state,
    obligationDays: trimObligationDays({ ...state.obligationDays, [key]: true }),
  }
}

export function normalizeDailyTasksState(value: unknown): DailyTasksState {
  const base = emptyDailyTasksState()
  if (!value || typeof value !== 'object') return base
  const row = value as Record<string, unknown>
  const rawTasks = Array.isArray(row.tasks) ? row.tasks : []
  const tasks = rawTasks.map(normalizeTask).filter((t): t is DailyTask => t !== null)
  const fromStore = Array.isArray(row.completed)
    ? row.completed.map(normalizeCompletedEntry).filter((t): t is CompletedDailyTask => t !== null)
    : []
  const migrated = migrateLegacyCompleted(rawTasks)
  const seen = new Set(fromStore.map(c => c.id))
  const completed = [...fromStore]
  for (const entry of migrated) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    completed.push(entry)
  }
  completed.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
  const trimmed = completed.slice(0, MAX_COMPLETED)
  const summaryHour = toClockHour(row.summaryHour)
  const summaryMinute = toClockMinute(row.summaryMinute)
  const state: DailyTasksState = {
    enabled: row.enabled === true,
    summaryEnabled: row.summaryEnabled === true,
    summaryHour: summaryHour ?? base.summaryHour,
    summaryMinute: row.summaryMinute == null ? base.summaryMinute : summaryMinute,
    tasks: sortTasks(tasks),
    completed: trimmed,
    history: rebuildHistoryFromCompleted(trimmed),
    obligationDays: normalizeObligationDays(row.obligationDays),
    updatedAt: typeof row.updatedAt === 'string' && row.updatedAt ? row.updatedAt : undefined,
  }
  return markObligationDay(state)
}

// ── Task list ops ─────────────────────────────────────────────────────────────

export function sortTasks(tasks: DailyTask[]): DailyTask[] {
  return [...tasks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return Date.parse(a.createdAt) - Date.parse(b.createdAt)
  })
}

export function addTask(
  state: DailyTasksState,
  input: NewDailyTaskInput,
  now: Date = new Date(),
): DailyTasksState {
  const title = input.title.trim()
  if (!title) return state
  const hour = toClockHour(input.hour)
  const minute = hour == null ? null : toClockMinute(input.minute)
  const weekdays = normalizeWeekdays(input.weekdays)
  const maxOrder = state.tasks.reduce((max, t) => Math.max(max, t.sortOrder), -1)
  const iso = now.toISOString()
  const scheduledOn = alignScheduledOn(isDateKey(input.scheduledOn) ? input.scheduledOn : todayKey(now), weekdays)
  const task: DailyTask = {
    id: `dt-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    hour,
    minute,
    sortOrder: maxOrder + 1,
    createdAt: iso,
    updatedAt: iso,
    scheduledOn,
  }
  if (weekdays) task.weekdays = weekdays
  return markObligationDay({ ...state, tasks: sortTasks([...state.tasks, task]) }, now)
}

export function updateTask(
  state: DailyTasksState,
  id: string,
  patch: Partial<NewDailyTaskInput>,
  now: Date = new Date(),
): DailyTasksState {
  const tasks = state.tasks.map(task => {
    if (task.id !== id) return task
    const next: DailyTask = { ...task, updatedAt: now.toISOString() }
    if (patch.title != null) next.title = patch.title.trim() || task.title
    if ('hour' in patch) {
      const hour = toClockHour(patch.hour)
      next.hour = hour
      next.minute = hour == null ? null : toClockMinute(patch.minute ?? task.minute)
    } else if ('minute' in patch && next.hour != null) {
      next.minute = toClockMinute(patch.minute)
    }
    if ('weekdays' in patch) {
      const weekdays = normalizeWeekdays(patch.weekdays)
      if (weekdays) next.weekdays = weekdays
      else delete next.weekdays
    }
    if ('scheduledOn' in patch && isDateKey(patch.scheduledOn)) {
      next.scheduledOn = alignScheduledOn(patch.scheduledOn, next.weekdays)
    }
    return next
  })
  return { ...state, tasks: sortTasks(tasks) }
}

export function removeTask(state: DailyTasksState, id: string): DailyTasksState {
  return { ...state, tasks: state.tasks.filter(t => t.id !== id) }
}

/** Move a task to a new index in the visible (sorted) list and reflow sortOrder. */
export function reorderTask(state: DailyTasksState, id: string, toIndex: number): DailyTasksState {
  const ordered = sortTasks(state.tasks)
  const fromIndex = ordered.findIndex(t => t.id === id)
  if (fromIndex === -1) return state
  const clamped = Math.max(0, Math.min(toIndex, ordered.length - 1))
  if (clamped === fromIndex) return state
  const [moved] = ordered.splice(fromIndex, 1)
  ordered.splice(clamped, 0, moved!)
  const tasks = ordered.map((task, index) => ({ ...task, sortOrder: index }))
  return { ...state, tasks }
}

/** Commit a full ordering (e.g. after drag-to-reorder) by reflowing sortOrder. */
export function applyTaskOrder(state: DailyTasksState, orderedIds: string[]): DailyTasksState {
  const rank = new Map(orderedIds.map((id, index) => [id, index]))
  const tasks = state.tasks.map(task => ({
    ...task,
    sortOrder: rank.has(task.id) ? rank.get(task.id)! : task.sortOrder,
  }))
  return { ...state, tasks: sortTasks(tasks) }
}

// ── Completion + scheduling predicates ───────────────────────────────────────

export function isTaskActiveOnDate(task: DailyTask, date: Date): boolean {
  if (!task.weekdays || task.weekdays.length === 0) return true
  return task.weekdays.includes(date.getDay())
}

export function isTaskActiveToday(task: DailyTask, now: Date = new Date()): boolean {
  return isTaskActiveOnDate(task, now)
}

/**
 * Complete a task: remove from the open list and archive in history.
 * Incomplete tasks stay until this is called (carry across days).
 */
export function completeTask(
  state: DailyTasksState,
  id: string,
  now: Date = new Date(),
): DailyTasksState {
  const task = state.tasks.find(t => t.id === id)
  if (!task) return state
  const key = todayKey(now)
  const iso = now.toISOString()
  if (isRepeatingTask(task)) {
    const occurrenceId = `${task.id}@${key}`
    if (state.completed.some(entry => entry.id === occurrenceId)) return state
    const entry: CompletedDailyTask = {
      id: occurrenceId,
      title: task.title,
      completedOn: key,
      completedAt: iso,
      hour: task.hour,
      minute: task.minute,
      source: 'task',
      seriesId: task.id,
    }
    if (task.weekdays) entry.weekdays = task.weekdays
    const completed = [entry, ...state.completed].slice(0, MAX_COMPLETED)
    const tasks = state.tasks.map(row =>
      row.id === task.id
        ? { ...row, scheduledOn: nextOccurrenceKey(task, now), updatedAt: iso }
        : row,
    )
    return markObligationDay({
      ...state,
      tasks,
      completed,
      history: rebuildHistoryFromCompleted(completed),
    }, now)
  }
  const entry: CompletedDailyTask = {
    id: task.id,
    title: task.title,
    completedOn: key,
    completedAt: iso,
    hour: task.hour,
    minute: task.minute,
    source: 'task',
  }
  if (task.weekdays) entry.weekdays = task.weekdays
  const completed = [entry, ...state.completed].slice(0, MAX_COMPLETED)
  const next: DailyTasksState = {
    ...state,
    tasks: state.tasks.filter(t => t.id !== id),
    completed,
    history: rebuildHistoryFromCompleted(completed),
  }
  return markObligationDay(next, now)
}

/** Move an open task to another local date without copying it. */
export function rescheduleTask(
  state: DailyTasksState,
  id: string,
  scheduledOn: string,
  now: Date = new Date(),
): DailyTasksState {
  if (!isDateKey(scheduledOn)) return state
  return updateTask(state, id, { scheduledOn }, now)
}

/** Archive a save-reminder into Done Today (caller cancels the OS reminder). */
export function completeReminderTask(
  state: DailyTasksState,
  input: {
    reminderId: string
    saveId: string
    title: string
    fireAt: string
    eventAt: string
  },
  now: Date = new Date(),
): DailyTasksState {
  const id = `rem-${input.reminderId}`
  if (state.completed.some(c => c.id === id && c.completedOn === todayKey(now))) {
    return state
  }
  const key = todayKey(now)
  const entry: CompletedDailyTask = {
    id,
    title: input.title.trim() || 'Reminder',
    completedOn: key,
    completedAt: now.toISOString(),
    source: 'reminder',
    saveId: input.saveId,
    reminderId: input.reminderId,
    fireAt: input.fireAt,
    eventAt: input.eventAt,
  }
  const completed = [entry, ...state.completed].slice(0, MAX_COMPLETED)
  return {
    ...state,
    completed,
    history: rebuildHistoryFromCompleted(completed),
  }
}

/**
 * Uncheck from Done Today: restore a task to the open list, or drop a
 * reminder archive entry (caller reschedules the save reminder).
 */
export function uncompleteTask(
  state: DailyTasksState,
  id: string,
  now: Date = new Date(),
): DailyTasksState {
  const entry = state.completed.find(c => c.id === id)
  if (!entry) return state
  const completed = state.completed.filter(c => c.id !== id)
  const history = rebuildHistoryFromCompleted(completed)

  if (entry.source === 'reminder') {
    return { ...state, completed, history }
  }

  if (entry.seriesId) {
    const tasks = state.tasks.map(task =>
      task.id === entry.seriesId
        ? { ...task, scheduledOn: entry.completedOn, updatedAt: now.toISOString() }
        : task,
    )
    return markObligationDay({ ...state, tasks, completed, history }, now)
  }

  if (state.tasks.some(t => t.id === entry.id)) {
    return { ...state, completed, history }
  }

  const maxOrder = state.tasks.reduce((max, t) => Math.max(max, t.sortOrder), -1)
  const iso = now.toISOString()
  const task: DailyTask = {
    id: entry.id,
    title: entry.title,
    hour: entry.hour ?? null,
    minute: entry.hour == null ? null : (entry.minute ?? 0),
    sortOrder: maxOrder + 1,
    createdAt: iso,
    updatedAt: iso,
    scheduledOn: entry.completedOn,
  }
  if (entry.weekdays) task.weekdays = entry.weekdays
  return markObligationDay(
    {
      ...state,
      tasks: sortTasks([...state.tasks, task]),
      completed,
      history,
    },
    now,
  )
}

/** @deprecated Prefer completeTask — kept as an alias for older call sites. */
export function toggleTaskDone(
  state: DailyTasksState,
  id: string,
  now: Date = new Date(),
): DailyTasksState {
  return completeTask(state, id, now)
}

export function completedOnDay(state: DailyTasksState, date: Date): CompletedDailyTask[] {
  const key = dateKey(date)
  return state.completed.filter(c => c.completedOn === key)
}

// ── Progress ─────────────────────────────────────────────────────────────────

export type DailyProgress = {
  /** Completed today. */
  done: number
  /** Still open (incomplete), including carryovers. */
  open: number
  /** done + open — used for the progress bar. */
  total: number
  pct: number
}

/** Progress for today: finished today vs due today (not future, not overdue). */
export function progressSummary(
  state: DailyTasksState,
  now: Date = new Date(),
  openReminderCount = 0,
): DailyProgress {
  const done = completedOnDay(state, now).length
  const open = tasksDueOnDay(state, now).length + Math.max(0, openReminderCount)
  const total = done + open
  return { done, open, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/** Open tasks whose scheduled date is this local day. */
export function tasksDueOnDay(state: DailyTasksState, now: Date = new Date()): DailyTask[] {
  const key = todayKey(now)
  return sortTasks(
    state.tasks.filter(task => taskScheduledKey(task, now) === key && isTaskActiveOnDate(task, now)),
  )
}

/** Open tasks whose scheduled date is before this local day. */
export function overdueTasks(state: DailyTasksState, now: Date = new Date()): DailyTask[] {
  const key = todayKey(now)
  return sortTasks(state.tasks.filter(task => taskScheduledKey(task, now) < key))
}

/** Open tasks scheduled on an exact local day (agenda). */
export function tasksScheduledOn(state: DailyTasksState, date: Date, now: Date = new Date()): DailyTask[] {
  const key = dateKey(date)
  return sortTasks(state.tasks.filter(task => taskScheduledKey(task, now) === key))
}

/** Open tasks that should show / remind today (scheduled today). */
export function tasksForToday(state: DailyTasksState, now: Date = new Date()): DailyTask[] {
  return tasksDueOnDay(state, now)
}

// ── Labels ───────────────────────────────────────────────────────────────────

export function formatTaskTimeLabel(hour: number | null, minute: number | null): string {
  if (hour == null) return 'Throughout the day'
  return formatReminderClock(applyReminderClock(new Date(2026, 0, 1), { hour, minute: minute ?? 0 }))
}

export function formatWeekdaysLabel(weekdays?: number[]): string {
  if (!weekdays || weekdays.length === 0 || weekdays.length === 7) return 'Every day until done'
  const set = new Set(weekdays)
  const isWeekdays = [1, 2, 3, 4, 5].every(d => set.has(d)) && set.size === 5
  if (isWeekdays) return 'Weekdays until done'
  const isWeekends = set.has(0) && set.has(6) && set.size === 2
  if (isWeekends) return 'Weekends until done'
  return [...weekdays].sort((a, b) => a - b).map(d => WEEKDAY_SHORT[d]).join(', ') + ' until done'
}

/** Subtitle under a task row, e.g. "8:00 am · Every day until done". */
export function formatTaskSubtitle(task: DailyTask): string {
  const parts: string[] = []
  if (task.hour != null) parts.push(formatTaskTimeLabel(task.hour, task.minute))
  parts.push(formatWeekdaysLabel(task.weekdays))
  return parts.join(' · ')
}

export function weekdayLongName(day: number): string {
  return WEEKDAY_LONG[day] ?? ''
}
