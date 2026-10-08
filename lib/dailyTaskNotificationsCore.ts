// Pure builders for Daily Tasks notifications — no expo / native imports, so
// this runs under `tsx --test`. The scheduling side-effects live in
// lib/dailyTaskNotifications.ts.

import { tasksDueOnDay, type DailyTask, type DailyTasksState } from './dailyTasks'

export const DAILY_TASK_PREFIX = 'trove.daily-task.'
export const DAILY_TASK_SUMMARY_ID = 'trove.daily-task-summary'
export const DAILY_TASK_CHANNEL_ID = 'daily-tasks-v1'

export type TaskTriggerDescriptor =
  | { identifier: string; kind: 'daily'; hour: number; minute: number }
  | { identifier: string; kind: 'weekly'; weekday: number /* 0-6 (Sun-Sat) */; hour: number; minute: number }

/** expo-notifications weekday domain is 1 (Sunday) .. 7 (Saturday). */
export function expoWeekday(day: number): number {
  return (((day % 7) + 7) % 7) + 1
}

/** One DAILY trigger for every-day tasks, or one WEEKLY trigger per selected weekday. */
export function buildTaskTriggerDescriptors(task: DailyTask): TaskTriggerDescriptor[] {
  if (task.hour == null) return []
  const hour = task.hour
  const minute = task.minute ?? 0
  const weekdays = task.weekdays
  if (!weekdays || weekdays.length === 0 || weekdays.length === 7) {
    return [{ identifier: `${DAILY_TASK_PREFIX}${task.id}`, kind: 'daily', hour, minute }]
  }
  return [...weekdays]
    .sort((a, b) => a - b)
    .map(day => ({
      identifier: `${DAILY_TASK_PREFIX}${task.id}.${day}`,
      kind: 'weekly' as const,
      weekday: day,
      hour,
      minute,
    }))
}

export function buildDailySummaryContent(
  state: DailyTasksState,
  now: Date = new Date(),
): { title: string; body: string } | null {
  const active = tasksDueOnDay(state, now)
  if (active.length === 0) return null
  const titles = active.map(t => t.title)
  const preview = titles.slice(0, 3).join(', ')
  const extra = titles.length > 3 ? ` +${titles.length - 3} more` : ''
  const noun = active.length === 1 ? 'task' : 'tasks'
  return {
    title: 'Daily Tasks',
    body: `${active.length} open ${noun}: ${preview}${extra}`,
  }
}

export function isDailyTaskNotificationId(identifier: string): boolean {
  return identifier === DAILY_TASK_SUMMARY_ID || identifier.startsWith(DAILY_TASK_PREFIX)
}
