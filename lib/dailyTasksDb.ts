import type { SupabaseClient } from '@supabase/supabase-js'
import {
  dailyTasksStateFromCloudRow,
  dailyTasksStateToCloudPayload,
  isMeaningfulDailyTasksState,
  mergeDailyTasksState,
  type CloudDailyTasksRow,
} from './dailyTasksCloudSync'
import type { DailyTasksState } from './dailyTasks'

let tableAvailable: boolean | null = null

async function hasDailyTasksTable(supabase: SupabaseClient): Promise<boolean> {
  if (tableAvailable !== null) return tableAvailable
  const { error } = await supabase.from('daily_tasks').select('user_id').limit(1)
  if (!error) {
    tableAvailable = true
    return true
  }
  const message = error.message ?? ''
  if (message.includes('daily_tasks') || message.includes('schema cache')) {
    tableAvailable = false
    return false
  }
  tableAvailable = true
  return true
}

export async function fetchCloudDailyTasks(
  supabase: SupabaseClient,
  userId: string,
): Promise<DailyTasksState | null> {
  if (!(await hasDailyTasksTable(supabase))) return null
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('user_id, state, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    if ((error.message ?? '').includes('daily_tasks')) tableAvailable = false
    return null
  }
  return dailyTasksStateFromCloudRow((data as CloudDailyTasksRow | null) ?? null)
}

export async function upsertCloudDailyTasks(
  supabase: SupabaseClient,
  userId: string,
  state: DailyTasksState,
): Promise<void> {
  // Never upload enabled-only / empty shells — they were wiping phone tasks.
  if (!isMeaningfulDailyTasksState(state)) return
  if (!(await hasDailyTasksTable(supabase))) return
  const payload = dailyTasksStateToCloudPayload(state, userId)
  const { error } = await supabase.from('daily_tasks').upsert(payload, { onConflict: 'user_id' })
  if (error && (error.message ?? '').includes('daily_tasks')) tableAvailable = false
}

/** Pull remote, merge with local (union streak history), push winner. */
export async function syncDailyTasksWithCloud(
  supabase: SupabaseClient,
  userId: string,
  local: DailyTasksState,
): Promise<DailyTasksState> {
  // Re-probe each sync — table may have been created after an earlier miss.
  tableAvailable = null
  const remote = await fetchCloudDailyTasks(supabase, userId)
  if (!remote) {
    // Never seed cloud with an empty virgin browser — phone is first source.
    if (isMeaningfulDailyTasksState(local)) {
      await upsertCloudDailyTasks(supabase, userId, local).catch(() => {})
    }
    return local
  }
  const merged = mergeDailyTasksState(local, remote)
  await upsertCloudDailyTasks(supabase, userId, merged).catch(() => {})
  return merged
}

export function __resetDailyTasksCloudTableProbe(): void {
  tableAvailable = null
}
