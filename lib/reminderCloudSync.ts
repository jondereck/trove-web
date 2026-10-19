import {
  isHistoryHiddenAfterClear,
  preserveCalendarLinkage,
  type StoredSaveReminder,
} from './saveRemindersCore'

export type CloudReminderRow = {
  id: string
  user_id: string
  save_id: string
  title: string
  source_text: string | null
  event_at: string
  event_end_at: string | null
  fire_at: string
  lead_minutes: number
  fired_at: string | null
  repeat: StoredSaveReminder['repeat']
  updated_at: string
  deleted_at: string | null
  calendar_id?: undefined
  calendar_event_id?: undefined
}

function stamp(row: Pick<StoredSaveReminder, 'updatedAt' | 'fireAt' | 'deletedAt'>): string {
  return row.updatedAt || row.deletedAt || row.fireAt
}

function startOfNextLocalDay(now = Date.now()): number {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
}

/**
 * After a Daily tick, phone advances fireAt past today and uploads. Web local
 * may still hold today's fireAt with a newer hydrate stamp — prefer the
 * schedule that already moved to a future day.
 */
function pickOpenReminder(
  local: StoredSaveReminder,
  remote: StoredSaveReminder,
  now = Date.now(),
): StoredSaveReminder {
  const endToday = startOfNextLocalDay(now)
  const localFire = Date.parse(local.fireAt)
  const remoteFire = Date.parse(remote.fireAt)
  if (Number.isFinite(localFire) && Number.isFinite(remoteFire)) {
    if (localFire < endToday && remoteFire >= endToday) return remote
    if (remoteFire < endToday && localFire >= endToday) return local
  }
  return stamp(remote) >= stamp(local) ? remote : local
}

export function isCloudSyncableReminder(row: StoredSaveReminder): boolean {
  return !row.localOnly
}

export function reminderToCloudRow(row: StoredSaveReminder, userId: string): CloudReminderRow {
  return {
    id: row.id,
    user_id: userId,
    save_id: row.saveId,
    title: row.title,
    source_text: row.sourceText ?? null,
    event_at: row.eventAt,
    event_end_at: row.eventEndAt ?? null,
    fire_at: row.fireAt,
    lead_minutes: row.leadMinutes,
    fired_at: row.firedAt ?? null,
    repeat: row.repeat ?? null,
    updated_at: row.updatedAt || new Date().toISOString(),
    deleted_at: row.deletedAt ?? null,
  }
}

export function reminderFromCloudRow(row: Partial<CloudReminderRow> | null | undefined): StoredSaveReminder | null {
  if (!row?.id || !row.save_id || !row.fire_at) return null
  return {
    id: row.id,
    saveId: row.save_id,
    title: row.title ?? '',
    sourceText: row.source_text ?? null,
    eventAt: row.event_at || row.fire_at,
    eventEndAt: row.event_end_at ?? null,
    fireAt: row.fire_at,
    leadMinutes: typeof row.lead_minutes === 'number' ? row.lead_minutes : 0,
    firedAt: row.fired_at ?? null,
    calendarId: null,
    calendarEventId: null,
    repeat: row.repeat ?? null,
    updatedAt: row.updated_at ?? null,
    deletedAt: row.deleted_at ?? null,
  }
}

export function mergeUpcomingReminders(
  local: Record<string, StoredSaveReminder>,
  remote: Record<string, StoredSaveReminder>,
  now = Date.now(),
): Record<string, StoredSaveReminder> {
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)])
  const merged: Record<string, StoredSaveReminder> = {}
  for (const id of ids) {
    const localRow = local[id]
    const remoteRow = remote[id]
    let winner: StoredSaveReminder | undefined
    if (!localRow) winner = remoteRow
    else if (!remoteRow) winner = localRow
    else if (localRow.deletedAt || remoteRow.deletedAt) {
      winner = stamp(remoteRow) >= stamp(localRow) ? remoteRow : localRow
    } else {
      winner = pickOpenReminder(localRow, remoteRow, now)
    }
    if (!winner || winner.deletedAt) continue
    merged[id] = preserveCalendarLinkage(winner, localRow)
  }
  return merged
}

function historyKey(row: StoredSaveReminder): string {
  return `${row.id}|${row.eventAt}|${row.firedAt ?? row.deletedAt ?? row.fireAt}`
}

/** Fold remote fired/cancelled rows into local History so removes stay in sync. */
export function mergeHistoryReminders(
  localHistory: StoredSaveReminder[],
  remote: Record<string, StoredSaveReminder>,
  historyClearedAt?: string | null,
): StoredSaveReminder[] {
  const byKey = new Map<string, StoredSaveReminder>()
  const consider = (row: StoredSaveReminder) => {
    if (isHistoryHiddenAfterClear(row, historyClearedAt)) return
    const key = historyKey(row)
    const existing = byKey.get(key)
    if (!existing || stamp(row) >= stamp(existing)) {
      byKey.set(key, row)
    }
  }
  for (const row of localHistory) {
    consider(row)
  }
  for (const row of Object.values(remote)) {
    if (!row.deletedAt && !row.firedAt) continue
    consider({
      ...row,
      firedAt: row.firedAt ?? row.deletedAt ?? row.fireAt,
    })
  }
  return [...byKey.values()].sort((a, b) =>
    (b.firedAt ?? b.fireAt).localeCompare(a.firedAt ?? a.fireAt),
  )
}

