// Pure merge helpers for Daily Tasks cloud sync (no native imports).

import {
  MAX_COMPLETED,
  normalizeDailyTasksState,
  type CompletedDailyTask,
  type DailyTasksState,
} from './dailyTasks'

export type CloudDailyTasksRow = {
  user_id: string
  state: unknown
  updated_at: string
}

export function stateUpdatedAtMs(state: DailyTasksState): number {
  const at = Date.parse(state.updatedAt ?? '')
  return Number.isFinite(at) ? at : 0
}

function mergeCompleted(
  a: CompletedDailyTask[],
  b: CompletedDailyTask[],
): CompletedDailyTask[] {
  const byId = new Map<string, CompletedDailyTask>()
  for (const entry of [...a, ...b]) {
    const prev = byId.get(entry.id)
    if (!prev) {
      byId.set(entry.id, entry)
      continue
    }
    // Keep the richer / newer archive row.
    const prevAt = Date.parse(prev.completedAt) || 0
    const nextAt = Date.parse(entry.completedAt) || 0
    if (nextAt >= prevAt) byId.set(entry.id, entry)
  }
  return [...byId.values()]
    .sort((x, y) => Date.parse(y.completedAt) - Date.parse(x.completedAt))
    .slice(0, MAX_COMPLETED)
}

function mergeObligationDays(
  a: Record<string, true>,
  b: Record<string, true>,
): Record<string, true> {
  return { ...a, ...b }
}

/**
 * Shell = toggle/settings only (no open tasks, archive, or streak days).
 * Turning Daily Tasks “on” in a fresh browser must not wipe phone content.
 */
export function isShellDailyTasksState(state: DailyTasksState): boolean {
  return (
    state.tasks.length === 0 &&
    state.completed.length === 0 &&
    Object.keys(state.obligationDays).length === 0
  )
}

/** True when the document has content worth uploading / preferring over a shell. */
export function isMeaningfulDailyTasksState(state: DailyTasksState): boolean {
  return !isShellDailyTasksState(state)
}

/**
 * Prefer the newer document for open tasks / toggles, but union completed +
 * obligation days so streak history is never lost across devices.
 *
 * A shell document (enabled-only / empty) never wins over a contentful peer,
 * even if its updatedAt is newer — that was wiping phone tasks after web Turn on.
 */
export function mergeDailyTasksState(
  local: DailyTasksState,
  remote: DailyTasksState,
): DailyTasksState {
  const localAt = stateUpdatedAtMs(local)
  const remoteAt = stateUpdatedAtMs(remote)
  const localShell = isShellDailyTasksState(local)
  const remoteShell = isShellDailyTasksState(remote)

  let newer: DailyTasksState
  let older: DailyTasksState
  if (localShell && !remoteShell) {
    newer = remote
    older = local
  } else if (remoteShell && !localShell) {
    newer = local
    older = remote
  } else {
    newer = remoteAt > localAt ? remote : local
    older = newer === remote ? local : remote
  }

  const updatedAt = new Date(Math.max(localAt, remoteAt, Date.now())).toISOString()

  return normalizeDailyTasksState({
    ...newer,
    // Keep enabled if either side turned the feature on.
    enabled: newer.enabled || older.enabled,
    completed: mergeCompleted(newer.completed, older.completed),
    obligationDays: mergeObligationDays(newer.obligationDays, older.obligationDays),
    updatedAt,
  })
}

export function dailyTasksStateFromCloudRow(row: CloudDailyTasksRow | null): DailyTasksState | null {
  if (!row) return null
  const state = normalizeDailyTasksState(row.state)
  const remoteAt = typeof row.updated_at === 'string' ? row.updated_at : state.updatedAt
  return {
    ...state,
    updatedAt: remoteAt || state.updatedAt,
  }
}

export function dailyTasksStateToCloudPayload(
  state: DailyTasksState,
  userId: string,
): CloudDailyTasksRow {
  const updatedAt = state.updatedAt || new Date().toISOString()
  return {
    user_id: userId,
    state: {
      ...state,
      updatedAt,
    },
    updated_at: updatedAt,
  }
}
