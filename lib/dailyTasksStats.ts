// Streak / agenda helpers for Daily Tasks. Pure (no native imports).
//
// Streak = consecutive days with ≥1 completion.
// - Today with 0 completions: grace (doesn't break yet).
// - Past day with 0 completions and no obligation (no tasks that day): skip.
// - Past day with obligation but 0 completions: break.
// - ≥1 completion: counts (+1). One done is enough.

import {
  completedOnDay,
  dateKey,
  overdueTasks,
  startOfDay,
  tasksDueOnDay,
  tasksScheduledOn,
  type DailyTasksState,
  MAX_HISTORY_DAYS,
} from './dailyTasks'

function addDays(date: Date, delta: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + delta)
  return next
}

/**
 * Consecutive days ending today where the user completed ≥1 task.
 * Empty no-task days are skipped; obligation days with zero completions break.
 */
export function overallStreak(state: DailyTasksState, now: Date = new Date()): number {
  let streak = 0
  const today = startOfDay(now)
  for (let i = 0; i < MAX_HISTORY_DAYS; i += 1) {
    const day = addDays(today, -i)
    const key = dateKey(day)
    const count = (state.history[key] ?? []).length
    if (count > 0) {
      streak += 1
      continue
    }
    if (i === 0) continue // today grace
    if (!state.obligationDays[key]) continue // no tasks that day — skip
    break // had open work, completed none
  }
  return streak
}

/** Completion status for a single day (for the agenda calendar). */
export type DayCompletion = 'none' | 'partial' | 'complete'

/**
 * `complete` = finished ≥1 that day and no open tasks remain (inbox clear).
 * `partial` = finished ≥1 that day but open tasks still exist.
 * Past days with any completion → complete.
 */
export function dayCompletion(
  state: DailyTasksState,
  date: Date,
  now: Date = new Date(),
): DayCompletion {
  const done = completedOnDay(state, date).length
  if (done === 0) return 'none'
  const isToday = dateKey(date) === dateKey(startOfDay(now))
  const stillOpen = isToday
    ? tasksDueOnDay(state, now).length + overdueTasks(state, now).length
    : tasksScheduledOn(state, date, now).length
  if (stillOpen > 0) return 'partial'
  return 'complete'
}
