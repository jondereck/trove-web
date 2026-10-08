// Local-first Daily Tasks persistence (localStorage). Cloud users sync via Supabase.

import {
  emptyDailyTasksState,
  markObligationDay,
  normalizeDailyTasksState,
  type DailyTasksState,
} from './dailyTasks'

export const DAILY_TASKS_STORE_KEY = 'trove.dailyTasks.v1'

type Listener = (state: DailyTasksState) => void
const listeners = new Set<Listener>()

let cache: DailyTasksState | null = null
let cloudSyncedOnce = false

function persistLocal(state: DailyTasksState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DAILY_TASKS_STORE_KEY, JSON.stringify(state))
  } catch {
    // best effort
  }
}

function loadLocal(): DailyTasksState {
  if (typeof window === 'undefined') return emptyDailyTasksState()
  try {
    const raw = localStorage.getItem(DAILY_TASKS_STORE_KEY)
    return raw ? normalizeDailyTasksState(JSON.parse(raw)) : emptyDailyTasksState()
  } catch {
    return emptyDailyTasksState()
  }
}

export function peekDailyTasks(): DailyTasksState {
  if (cache) return cache
  cache = loadLocal()
  return cache
}

export async function readDailyTasks(): Promise<DailyTasksState> {
  if (cache) {
    const marked = markObligationDay(cache)
    if (marked !== cache) {
      cache = marked
      persistLocal(marked)
    }
    return cache
  }
  cache = loadLocal()
  const marked = markObligationDay(cache)
  if (marked !== cache) {
    cache = marked
    persistLocal(marked)
  }
  return cache
}

export async function writeDailyTasks(state: DailyTasksState): Promise<DailyTasksState> {
  const next = markObligationDay(
    normalizeDailyTasksState({
      ...state,
      updatedAt: new Date().toISOString(),
    }),
  )
  cache = next
  persistLocal(next)
  listeners.forEach(listener => listener(next))
  return next
}

export async function mutateDailyTasks(
  transform: (state: DailyTasksState) => DailyTasksState,
): Promise<DailyTasksState> {
  const current = await readDailyTasks()
  return writeDailyTasks(transform(current))
}

export function subscribeDailyTasks(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Pull+merge from Supabase. Pass `force` after login / focus to pick up phone
 * uploads even if this tab already synced once.
 */
export async function syncDailyTasksCloud(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  options?: { force?: boolean },
): Promise<DailyTasksState> {
  const local = await readDailyTasks()
  if (cloudSyncedOnce && !options?.force) return local
  cloudSyncedOnce = true
  try {
    const { syncDailyTasksWithCloud } = await import('./dailyTasksDb')
    const beforeFp = dailyTasksFingerprint(local)
    const merged = await syncDailyTasksWithCloud(supabase, userId, local)
    cache = merged
    persistLocal(merged)
    // Only notify when the document actually changed — avoids cascading
    // setState into remounting subscribers during Strict Mode / HMR / Realtime echo.
    if (dailyTasksFingerprint(merged) !== beforeFp) {
      listeners.forEach(listener => listener(merged))
    }
    return merged
  } catch {
    return local
  }
}

/** @deprecated use syncDailyTasksCloud */
export async function syncDailyTasksCloudOnce(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
): Promise<DailyTasksState> {
  return syncDailyTasksCloud(supabase, userId)
}

export function invalidateDailyTasksCloudSync(): void {
  cloudSyncedOnce = false
}

/** Fingerprint for skipping no-op realtime echoes of our own upserts. */
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
  })
}

export async function pushDailyTasksCloud(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  state: DailyTasksState,
): Promise<void> {
  try {
    const { upsertCloudDailyTasks } = await import('./dailyTasksDb')
    await upsertCloudDailyTasks(supabase, userId, state)
  } catch {
    // best effort
  }
}

/** Test helper */
export function __resetDailyTasksStoreCache(): void {
  cache = null
  cloudSyncedOnce = false
}
