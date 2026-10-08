// Pure merge helpers for Daily Tasks cloud sync (no native imports).
// Multi-device: SWR-style — keep local UI, revalidate from cloud, merge by
// unioning open tasks (by id) instead of whole-document LWW.

import {
  MAX_COMPLETED,
  normalizeDailyTasksState,
  sortTasks,
  type CompletedDailyTask,
  type DailyTask,
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

/** Fingerprint for skipping no-op realtime echoes / redundant upserts. */
export function dailyTasksFingerprint(state: DailyTasksState): string {
  return JSON.stringify({
    enabled: state.enabled,
    updatedAt: state.updatedAt,
    summaryEnabled: state.summaryEnabled,
    summaryHour: state.summaryHour,
    summaryMinute: state.summaryMinute,
    tasks: state.tasks,
    completed: state.completed,
    obligationDays: state.obligationDays,
    removedTaskIds: state.removedTaskIds,
    clearedCompletedIds: state.clearedCompletedIds,
  })
}

function mergeCompleted(
  a: CompletedDailyTask[],
  b: CompletedDailyTask[],
  clearedCompletedIds: Record<string, string>,
): CompletedDailyTask[] {
  const byId = new Map<string, CompletedDailyTask>()
  for (const entry of [...a, ...b]) {
    const clearedAt = clearedCompletedIds[entry.id]
    if (clearedAt && (Date.parse(clearedAt) || 0) >= (Date.parse(entry.completedAt) || 0)) {
      continue
    }
    const prev = byId.get(entry.id)
    if (!prev) {
      byId.set(entry.id, entry)
      continue
    }
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

function mergeRemovedTaskIds(
  a: Record<string, string>,
  b: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...a }
  for (const [id, at] of Object.entries(b)) {
    const prev = out[id]
    if (!prev || (Date.parse(at) || 0) >= (Date.parse(prev) || 0)) out[id] = at
  }
  return out
}

function completedBlocksOpenId(completed: CompletedDailyTask[], taskId: string): boolean {
  return completed.some(entry => entry.id === taskId || entry.seriesId === taskId)
}

/** Union open tasks by id; per-id LWW on task.updatedAt; respect removes + completed. */
export function mergeOpenTasks(
  a: DailyTask[],
  b: DailyTask[],
  completed: CompletedDailyTask[],
  removedTaskIds: Record<string, string>,
): DailyTask[] {
  const byId = new Map<string, DailyTask>()
  for (const task of [...a, ...b]) {
    if (completedBlocksOpenId(completed, task.id)) continue
    const removedAt = removedTaskIds[task.id]
    if (removedAt && (Date.parse(removedAt) || 0) >= (Date.parse(task.updatedAt) || 0)) {
      continue
    }
    const prev = byId.get(task.id)
    if (!prev) {
      byId.set(task.id, task)
      continue
    }
    const prevAt = Date.parse(prev.updatedAt) || 0
    const nextAt = Date.parse(task.updatedAt) || 0
    if (nextAt >= prevAt) byId.set(task.id, task)
  }
  return sortTasks([...byId.values()])
}

/**
 * Shell = toggle/settings only (no open tasks, archive, or streak days).
 * Turning Daily Tasks “on” in a fresh browser must not wipe phone content.
 */
export function isShellDailyTasksState(state: DailyTasksState): boolean {
  return (
    state.tasks.length === 0 &&
    state.completed.length === 0 &&
    Object.keys(state.obligationDays).length === 0 &&
    Object.keys(state.removedTaskIds).length === 0 &&
    Object.keys(state.clearedCompletedIds).length === 0
  )
}

/** True when the document has content worth uploading / preferring over a shell. */
export function isMeaningfulDailyTasksState(state: DailyTasksState): boolean {
  return !isShellDailyTasksState(state)
}

/**
 * SWR merge for multi-device:
 * - Open tasks: union by id (creates on either device survive)
 * - Completed / obligation days / remove tombstones: union
 * - Settings: prefer newer document clock; enabled stays on if either side is on
 * - Shell docs never wipe contentful peers for settings base
 */
export function mergeDailyTasksState(
  local: DailyTasksState,
  remote: DailyTasksState,
): DailyTasksState {
  const localAt = stateUpdatedAtMs(local)
  const remoteAt = stateUpdatedAtMs(remote)
  const localShell = isShellDailyTasksState(local)
  const remoteShell = isShellDailyTasksState(remote)

  let settingsBase: DailyTasksState
  let settingsOther: DailyTasksState
  if (localShell && !remoteShell) {
    settingsBase = remote
    settingsOther = local
  } else if (remoteShell && !localShell) {
    settingsBase = local
    settingsOther = remote
  } else if (remoteAt > localAt) {
    settingsBase = remote
    settingsOther = local
  } else {
    settingsBase = local
    settingsOther = remote
  }

  const clearedCompletedIds = mergeRemovedTaskIds(
    local.clearedCompletedIds,
    remote.clearedCompletedIds,
  )
  const completed = mergeCompleted(local.completed, remote.completed, clearedCompletedIds)
  const removedTaskIds = mergeRemovedTaskIds(local.removedTaskIds, remote.removedTaskIds)
  const tasks = mergeOpenTasks(local.tasks, remote.tasks, completed, removedTaskIds)
  const updatedAt = new Date(Math.max(localAt, remoteAt)).toISOString()

  return normalizeDailyTasksState({
    ...settingsBase,
    enabled: settingsBase.enabled || settingsOther.enabled,
    summaryEnabled: settingsBase.summaryEnabled,
    summaryHour: settingsBase.summaryHour,
    summaryMinute: settingsBase.summaryMinute,
    tasks,
    completed,
    obligationDays: mergeObligationDays(local.obligationDays, remote.obligationDays),
    removedTaskIds,
    clearedCompletedIds,
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
