// Pure helpers for the Trackers feature (Save.type === 'tracker').
//
// A Tracker logs records over time and, from an optional interval/deadline rule,
// derives what comes next plus a coarse status. TrackerData is persisted as JSON
// in Save.content (no schema migration); this module is the read/write bridge and
// the calculation engine. Keep it pure (no expo / native imports) so it runs under
// `tsx --test`.

import type {
  Save,
  TrackerData,
  TrackerMetric,
  TrackerRecord,
  TrackerRule,
  TrackerTimeUnit,
} from './types'

export type TrackerStatus = 'on_track' | 'due_soon' | 'overdue' | 'active' | 'expired'

export interface TrackerNextDue {
  dueAt?: string
  dueMetric?: number
  combine: 'first' | 'all'
}

export interface TrackerSummary {
  status: TrackerStatus | null
  statusLabel: string | null
  /** Card/detail "next" line, e.g. "in ~6 months · 5,000 km" or "Expires Jan 23, 2028 · 1y 5m left". */
  nextLabel: string | null
  /** Cadence line, e.g. "Every 5,000 km / 6 months". */
  cadenceLabel: string | null
  /** Current record summary, e.g. "51,113 km · Aug 22, 2026". */
  lastRecordLabel: string | null
}

export const TRACKER_DUE_SOON_DAYS = 7
const DAY_MS = 86_400_000

const TIME_UNITS: TrackerTimeUnit[] = ['day', 'week', 'month', 'year']

// ── JSON bridge ────────────────────────────────────────────────────────────────

export function emptyTrackerData(): TrackerData {
  return { records: [] }
}

/**
 * Automatically creates recurring renewal records when rule.autoLog is true
 * and interval due dates have elapsed up to `now`.
 */
export function catchupAutoLogRecords(
  data: TrackerData,
  now: Date = new Date(),
): { data: TrackerData; addedCount: number } {
  const rule = data.rule
  if (!rule || rule.kind !== 'interval' || !rule.autoLog || !rule.time) {
    return { data, addedCount: 0 }
  }

  let current = data
  let addedCount = 0
  const maxIterations = 36 // Guard against runaway loops

  while (addedCount < maxIterations) {
    const nextDue = computeNextDue(current, now)
    if (!nextDue?.dueAt) break
    const dueTime = Date.parse(nextDue.dueAt)
    if (!Number.isFinite(dueTime) || dueTime > now.getTime()) break

    const last = currentRecord(current)
    const newRecord: TrackerRecord = {
      id: `tr-auto-${dueTime}-${Math.random().toString(36).slice(2, 8)}`,
      at: nextDue.dueAt,
      ...(typeof last?.metricValue === 'number' ? { metricValue: last.metricValue } : {}),
      ...(last?.label ? { label: last.label } : { label: 'Auto-renewed' }),
      ...(last?.note ? { note: last.note } : {}),
    }

    current = upsertRecord(current, newRecord)
    addedCount++
  }

  return { data: current, addedCount }
}

/**
 * Creates a new record for "now" using the exact values (metricValue, label, note)
 * of the most recent record, updating only the timestamp.
 */
export function createQuickRecord(data: TrackerData, now: Date = new Date()): TrackerRecord {
  const last = currentRecord(data)
  const id = `tr-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
  const at = now.toISOString()
  if (!last) {
    return { id, at, label: 'Logged' }
  }
  return {
    id,
    at,
    ...(typeof last.metricValue === 'number' ? { metricValue: last.metricValue } : {}),
    ...(last.label ? { label: last.label } : {}),
    ...(last.note ? { note: last.note } : {}),
  }
}

/** Parse + validate the tracker JSON stored in Save.content. Tolerant of garbage. */
export function readTracker(save: Pick<Save, 'type' | 'content' | 'tracker'>): TrackerData | null {
  if (save.type !== 'tracker') return null
  let normalized: TrackerData
  if (save.tracker && Array.isArray(save.tracker.records)) {
    normalized = normalizeTrackerData(save.tracker)
  } else {
    const raw = save.content
    if (!raw || typeof raw !== 'string') return emptyTrackerData()
    try {
      normalized = normalizeTrackerData(JSON.parse(raw))
    } catch {
      return emptyTrackerData()
    }
  }
  if (normalized.rule?.kind === 'interval' && normalized.rule.autoLog) {
    return catchupAutoLogRecords(normalized).data
  }
  return normalized
}

export function serializeTrackerContent(data: TrackerData): string {
  return JSON.stringify(normalizeTrackerData(data))
}

export function normalizeTrackerData(value: unknown): TrackerData {
  const row = (value && typeof value === 'object' ? value : {}) as Partial<TrackerData>
  const records = Array.isArray(row.records)
    ? row.records
        .map(normalizeRecord)
        .filter((r): r is TrackerRecord => r !== null)
    : []
  return {
    metric: normalizeMetric(row.metric),
    rule: normalizeRule(row.rule),
    ...(row.calendarView === true ? { calendarView: true } : {}),
    records: sortRecords(records),
  }
}

function normalizeMetric(value: unknown): TrackerMetric | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Partial<TrackerMetric>
  const label = typeof row.label === 'string' ? row.label.trim() : ''
  const unit = typeof row.unit === 'string' ? row.unit.trim() : ''
  if (!label && !unit) return undefined
  return { label: label || unit, unit }
}

function normalizeRule(value: unknown): TrackerRule | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  if (row.kind === 'deadline') {
    const dueAt = typeof row.dueAt === 'string' ? row.dueAt : ''
    if (!dueAt || Number.isNaN(Date.parse(dueAt))) return undefined
    const leadDays = toPositiveInt(row.leadDays)
    return leadDays != null ? { kind: 'deadline', dueAt, leadDays } : { kind: 'deadline', dueAt }
  }
  if (row.kind === 'interval') {
    const time = normalizeIntervalTime(row.time)
    const metric = normalizeIntervalMetric(row.metric)
    if (!time && !metric) return undefined
    const combine = row.combine === 'all' ? 'all' : 'first'
    const autoLog = Boolean(row.autoLog)
    return {
      kind: 'interval',
      ...(time ? { time } : {}),
      ...(metric ? { metric } : {}),
      combine,
      ...(autoLog ? { autoLog: true } : {}),
    }
  }
  return undefined
}

function normalizeIntervalTime(value: unknown): { every: number; unit: TrackerTimeUnit } | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const every = toPositiveInt(row.every)
  const unit = TIME_UNITS.includes(row.unit as TrackerTimeUnit) ? (row.unit as TrackerTimeUnit) : undefined
  if (!every || !unit) return undefined
  return { every, unit }
}

function normalizeIntervalMetric(value: unknown): { every: number } | undefined {
  if (!value || typeof value !== 'object') return undefined
  const every = toPositiveNumber((value as Record<string, unknown>).every)
  if (every == null) return undefined
  return { every }
}

function normalizeRecord(value: unknown): TrackerRecord | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const at = typeof row.at === 'string' ? row.at : ''
  if (!at || Number.isNaN(Date.parse(at))) return null
  const id = typeof row.id === 'string' && row.id ? row.id : `tr-${Date.parse(at)}-${Math.random().toString(36).slice(2, 8)}`
  const record: TrackerRecord = { id, at }
  const metricValue = toFiniteNumber(row.metricValue)
  if (metricValue != null) record.metricValue = metricValue
  if (typeof row.label === 'string' && row.label.trim()) record.label = row.label.trim()
  if (typeof row.note === 'string' && row.note.trim()) record.note = row.note.trim()
  return record
}

// ── Records ──────────────────────────────────────────────────────────────────

/** Newest first (records[0] is current). Stable for equal timestamps. */
export function sortRecords(records: TrackerRecord[]): TrackerRecord[] {
  return [...records].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

export function currentRecord(data: TrackerData): TrackerRecord | null {
  return sortRecords(data.records)[0] ?? null
}

export function previousRecord(data: TrackerData): TrackerRecord | null {
  return sortRecords(data.records)[1] ?? null
}

export function upsertRecord(data: TrackerData, record: TrackerRecord): TrackerData {
  const rest = data.records.filter(r => r.id !== record.id)
  return { ...data, records: sortRecords([record, ...rest]) }
}

export function removeRecord(data: TrackerData, id: string): TrackerData {
  return { ...data, records: sortRecords(data.records.filter(r => r.id !== id)) }
}

// ── Calculations ───────────────────────────────────────────────────────────────

/** Add a time interval to a date with month-end clamping (Jan 31 + 1mo → Feb 28). */
export function addTimeInterval(from: Date, every: number, unit: TrackerTimeUnit): Date {
  const next = new Date(from.getTime())
  const n = Math.max(1, Math.floor(every))
  if (unit === 'day') next.setDate(next.getDate() + n)
  else if (unit === 'week') next.setDate(next.getDate() + n * 7)
  else if (unit === 'year') {
    const targetDay = from.getDate()
    next.setDate(1)
    next.setFullYear(next.getFullYear() + n)
    next.setDate(Math.min(targetDay, daysInMonth(next.getFullYear(), next.getMonth())))
  } else {
    const targetDay = from.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() + n)
    next.setDate(Math.min(targetDay, daysInMonth(next.getFullYear(), next.getMonth())))
  }
  return next
}

export function computeNextDue(data: TrackerData, _now: Date = new Date()): TrackerNextDue | null {
  const rule = data.rule
  if (!rule) return null
  if (rule.kind === 'deadline') {
    return { dueAt: rule.dueAt, combine: 'first' }
  }
  const anchor = currentRecord(data)
  if (!anchor) return null
  const result: TrackerNextDue = { combine: rule.combine ?? 'first' }
  if (rule.time) {
    result.dueAt = addTimeInterval(new Date(anchor.at), rule.time.every, rule.time.unit).toISOString()
  }
  if (rule.metric && data.metric && typeof anchor.metricValue === 'number') {
    result.dueMetric = anchor.metricValue + rule.metric.every
  }
  if (result.dueAt == null && result.dueMetric == null) return null
  return result
}

export function computeStatus(data: TrackerData, now: Date = new Date()): TrackerStatus | null {
  const rule = data.rule
  if (!rule) return null
  const next = computeNextDue(data, now)
  if (!next) return null

  if (rule.kind === 'deadline') {
    const due = Date.parse(next.dueAt!)
    if (!Number.isFinite(due)) return null
    if (now.getTime() >= due) return 'expired'
    const leadMs = (rule.leadDays ?? TRACKER_DUE_SOON_DAYS) * DAY_MS
    return due - now.getTime() <= leadMs ? 'due_soon' : 'active'
  }

  // Interval: status is driven by the date component (device can't sense metrics).
  if (next.dueAt == null) return 'on_track'
  const due = Date.parse(next.dueAt)
  if (!Number.isFinite(due)) return 'on_track'
  if (now.getTime() >= due) return 'overdue'
  return due - now.getTime() <= TRACKER_DUE_SOON_DAYS * DAY_MS ? 'due_soon' : 'on_track'
}

export function trackerHasDateDue(data: TrackerData, now: Date = new Date()): boolean {
  const next = computeNextDue(data, now)
  return !!next?.dueAt
}

// ── Formatting ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TrackerStatus, string> = {
  on_track: 'On track',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  active: 'Active',
  expired: 'Expired',
}

const CURRENCY_SYMBOLS = new Set(['₱', '$', '€', '£', '¥', '₩'])

export function isCurrencyUnit(unit?: string): boolean {
  if (!unit) return false
  const trimmed = unit.trim()
  const lower = trimmed.toLowerCase()
  return (
    CURRENCY_SYMBOLS.has(trimmed) ||
    lower === 'php' ||
    lower === 'peso' ||
    lower === 'pesos' ||
    lower === 'usd' ||
    lower === 'dollar' ||
    lower === 'dollars' ||
    lower === 'eur' ||
    lower === 'euro' ||
    lower === 'euros' ||
    lower === 'gbp' ||
    lower === 'pound' ||
    lower === 'pounds' ||
    lower === 'jpy' ||
    lower === 'yen' ||
    lower === 'krw' ||
    lower === 'won'
  )
}

export function getCurrencySymbol(unit?: string): string {
  if (!unit) return ''
  const trimmed = unit.trim()
  const lower = trimmed.toLowerCase()
  if (trimmed === '₱' || lower === 'php' || lower === 'peso' || lower === 'pesos') return '₱'
  if (trimmed === '$' || lower === 'usd' || lower === 'dollar' || lower === 'dollars') return '$'
  if (trimmed === '€' || lower === 'eur' || lower === 'euro' || lower === 'euros') return '€'
  if (trimmed === '£' || lower === 'gbp' || lower === 'pound' || lower === 'pounds') return '£'
  if (trimmed === '¥' || lower === 'jpy' || lower === 'yen') return '¥'
  if (trimmed === '₩' || lower === 'krw' || lower === 'won') return '₩'
  if (CURRENCY_SYMBOLS.has(trimmed)) return trimmed
  return trimmed
}

export function formatMetricValue(value: number, unit?: string): string {
  const formattedNum = formatNumber(value)
  if (!unit || !unit.trim()) return formattedNum
  const trimmed = unit.trim()
  if (isCurrencyUnit(trimmed)) {
    return `${getCurrencySymbol(trimmed)}${formattedNum}`
  }
  return `${formattedNum} ${trimmed}`
}

export function statusLabel(status: TrackerStatus | null): string | null {
  return status ? STATUS_LABELS[status] : null
}

export function formatTrackerSummary(data: TrackerData, now: Date = new Date()): TrackerSummary {
  const status = computeStatus(data, now)
  return {
    status,
    statusLabel: statusLabel(status),
    nextLabel: formatNextLabel(data, now),
    cadenceLabel: formatCadenceLabel(data.rule, data.metric),
    lastRecordLabel: formatRecordLabel(currentRecord(data), data.metric),
  }
}

export function formatNextLabel(data: TrackerData, now: Date = new Date()): string | null {
  const rule = data.rule
  const next = computeNextDue(data, now)
  if (!rule || !next) return null

  if (rule.kind === 'deadline' && next.dueAt) {
    const left = formatDurationBreakdown(Date.parse(next.dueAt) - now.getTime())
    return left ? `Expires ${formatDate(next.dueAt)} · ${left}` : `Expires ${formatDate(next.dueAt)}`
  }

  const parts: string[] = []
  if (next.dueAt) parts.push(formatRelativeDue(Date.parse(next.dueAt) - now.getTime()))
  if (next.dueMetric != null && data.metric) {
    const anchor = currentRecord(data)
    const remaining = typeof anchor?.metricValue === 'number' ? next.dueMetric - anchor.metricValue : next.dueMetric
    parts.push(formatMetricValue(remaining, data.metric.unit))
  }
  return parts.length ? parts.join(' · ') : null
}

/** e.g. "180 days", "~1.5 years", "today", "3 days overdue" — for overview hero. */
export function formatCountdownAmount(deltaMs: number): string {
  const days = Math.round(deltaMs / DAY_MS)
  if (days < 0) {
    const d = Math.abs(days)
    return `${d} ${d === 1 ? 'day' : 'days'} overdue`
  }
  if (days === 0) return 'today'
  if (days < 365) return `${days} ${days === 1 ? 'day' : 'days'}`
  const years = Math.round((days / 365) * 10) / 10
  return `~${years % 1 === 0 ? years : years.toFixed(1)} ${years === 1 ? 'year' : 'years'}`
}

/** Cadence without the leading "Every", e.g. "6 months / 5,000 km" or "1 month / ₱999". */
export function formatCadenceValue(
  rule: TrackerRule | undefined,
  metric?: TrackerMetric,
): string | null {
  if (!rule) return null
  if (rule.kind === 'deadline') return formatDate(rule.dueAt)
  const parts: string[] = []
  if (rule.time) parts.push(formatTimeEvery(rule.time.every, rule.time.unit))
  if (rule.metric) {
    parts.push(formatMetricValue(rule.metric.every, metric?.unit))
  }
  return parts.length ? parts.join(' / ') : null
}

/** Footnote under cadence when both time + metric apply. */
export function formatCombineNote(rule: TrackerRule | undefined): string | null {
  if (!rule || rule.kind !== 'interval') return null
  if (!rule.time || !rule.metric) return null
  return (rule.combine ?? 'first') === 'all' ? 'both must pass' : 'whichever comes first'
}

export function formatDateLong(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  const d = new Date(ms)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatCadenceLabel(
  rule: TrackerRule | undefined,
  metric?: TrackerMetric,
): string | null {
  if (!rule) return null
  if (rule.kind === 'deadline') return `Due ${formatDate(rule.dueAt)}`
  const value = formatCadenceValue(rule, metric)
  return value ? `Every ${value}` : null
}

export function formatRecordLabel(
  record: TrackerRecord | null,
  metric: TrackerMetric | undefined,
): string | null {
  if (!record) return null
  const parts: string[] = []
  if (typeof record.metricValue === 'number' && metric) {
    parts.push(formatMetricValue(record.metricValue, metric.unit))
  }
  parts.push(formatDate(record.at))
  return parts.join(' · ')
}

function formatTimeEvery(every: number, unit: TrackerTimeUnit): string {
  const n = Math.max(1, Math.floor(every))
  return `${n} ${unit}${n === 1 ? '' : 's'}`
}

/** e.g. "in ~6 months", "in 12 days", "due today", "overdue by 3 days". */
export function formatRelativeDue(deltaMs: number): string {
  const days = Math.round(deltaMs / DAY_MS)
  if (days < 0) {
    const d = Math.abs(days)
    return `overdue by ${d} ${d === 1 ? 'day' : 'days'}`
  }
  if (days === 0) return 'due today'
  if (days < 45) return `in ${days} ${days === 1 ? 'day' : 'days'}`
  if (days < 365) {
    const months = Math.round(days / 30)
    return `in ~${months} ${months === 1 ? 'month' : 'months'}`
  }
  const years = Math.round((days / 365) * 10) / 10
  return `in ~${years % 1 === 0 ? years : years.toFixed(1)} ${years === 1 ? 'year' : 'years'}`
}

/** e.g. "1y 5m", "3 months", "12 days". Empty when in the past. */
export function formatDurationBreakdown(deltaMs: number): string {
  if (deltaMs <= 0) return ''
  const core = formatElapsedDuration(deltaMs)
  return core ? `${core} left` : ''
}

/** Elapsed span for "since previous": days, then months, then years. */
export function formatElapsedDuration(deltaMs: number): string {
  const days = Math.round(Math.abs(deltaMs) / DAY_MS)
  if (days < 45) return `${days} ${days === 1 ? 'day' : 'days'}`
  const totalMonths = Math.round(days / 30)
  if (totalMonths < 12) return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'}`
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (months) return `${years}y ${months}m`
  return `${years} ${years === 1 ? 'year' : 'years'}`
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 100) / 100
  const [intPart, decPart] = Math.abs(rounded).toString().split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = rounded < 0 ? '-' : ''
  return decPart ? `${sign}${grouped}.${decPart}` : `${sign}${grouped}`
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  const d = new Date(ms)
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// ── Small numeric guards ─────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function toPositiveNumber(value: unknown): number | null {
  const n = toFiniteNumber(value)
  return n != null && n > 0 ? n : null
}

function toPositiveInt(value: unknown): number | null {
  const n = toFiniteNumber(value)
  return n != null && n > 0 ? Math.floor(n) : null
}
