import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  addTask,
  completeReminderTask,
  completeTask,
  completedOnDay,
  dateKey,
  emptyDailyTasksState,
  formatTaskSubtitle,
  formatTaskTimeLabel,
  formatWeekdaysLabel,
  isTaskActiveOnDate,
  normalizeDailyTasksState,
  normalizeWeekdays,
  overdueTasks,
  progressSummary,
  removeTask,
  reorderTask,
  rescheduleTask,
  tasksDueOnDay,
  todayKey,
  uncompleteTask,
  updateTask,
} from './dailyTasks'
import { dayCompletion, overallStreak } from './dailyTasksStats'
import {
  buildDailySummaryContent,
  buildTaskTriggerDescriptors,
  expoWeekday,
} from './dailyTaskNotificationsCore'

function stateWithTask(overrides: Partial<Parameters<typeof addTask>[1]> = {}, now = new Date(2026, 8, 20, 7, 0)) {
  return addTask(emptyDailyTasksState(), { title: 'Check email', hour: 8, minute: 0, ...overrides }, now)
}

describe('dailyTasks helpers', () => {
  const now = new Date(2026, 8, 20, 7, 0, 0) // Sun Sep 20 2026

  it('adds a task with incrementing sortOrder', () => {
    let state = emptyDailyTasksState()
    state = addTask(state, { title: 'A' }, now)
    state = addTask(state, { title: 'B' }, now)
    assert.equal(state.tasks.length, 2)
    assert.equal(state.tasks[0]!.sortOrder, 0)
    assert.equal(state.tasks[1]!.sortOrder, 1)
    assert.equal(state.tasks[0]!.hour, null)
  })

  it('ignores blank titles', () => {
    const state = addTask(emptyDailyTasksState(), { title: '   ' }, now)
    assert.equal(state.tasks.length, 0)
  })

  it('normalizes weekdays: empty and all-7 mean every day', () => {
    assert.equal(normalizeWeekdays([]), undefined)
    assert.equal(normalizeWeekdays([0, 1, 2, 3, 4, 5, 6]), undefined)
    assert.deepEqual(normalizeWeekdays([1, 1, 3, 9, -1]), [1, 3])
  })

  it('marks a task active only on its weekdays', () => {
    const state = stateWithTask({ weekdays: [1, 2, 3, 4, 5] }, now)
    const task = state.tasks[0]!
    assert.equal(isTaskActiveOnDate(task, new Date(2026, 8, 20)), false) // Sunday
    assert.equal(isTaskActiveOnDate(task, new Date(2026, 8, 21)), true) // Monday
  })

  it('completing a task moves it to history and removes it from the open list', () => {
    let state = stateWithTask({}, now)
    const id = state.tasks[0]!.id
    state = completeTask(state, id, now)
    assert.equal(state.tasks.length, 0)
    assert.equal(state.completed.length, 1)
    assert.equal(state.completed[0]!.id, id)
    assert.equal(state.completed[0]!.completedOn, todayKey(now))
    assert.deepEqual(state.history[todayKey(now)], [id])
  })

  it('uncompleting restores a task from Done Today', () => {
    let state = stateWithTask({ title: 'Walk' }, now)
    const id = state.tasks[0]!.id
    state = completeTask(state, id, now)
    assert.equal(state.tasks.length, 0)
    state = uncompleteTask(state, id, now)
    assert.equal(state.tasks.length, 1)
    assert.equal(state.tasks[0]!.title, 'Walk')
    assert.equal(state.completed.length, 0)
  })

  it('completing a reminder archives it in Done Today', () => {
    let state = emptyDailyTasksState()
    state = completeReminderTask(state, {
      reminderId: 'r1',
      saveId: 's1',
      title: 'Lunch',
      fireAt: now.toISOString(),
      eventAt: now.toISOString(),
    }, now)
    assert.equal(state.completed.length, 1)
    assert.equal(state.completed[0]!.source, 'reminder')
    assert.equal(state.completed[0]!.reminderId, 'r1')
    assert.equal(completedOnDay(state, now).length, 1)
    state = uncompleteTask(state, state.completed[0]!.id, now)
    assert.equal(state.completed.length, 0)
  })

  it('incomplete tasks stay open across days but do not count as tomorrow', () => {
    let state = stateWithTask({}, now)
    const tomorrow = new Date(2026, 8, 21, 7, 0, 0)
    assert.equal(state.tasks.length, 1)
    assert.equal(state.tasks[0]!.scheduledOn, todayKey(now))
    const p = progressSummary(state, tomorrow)
    assert.equal(p.open, 0)
    assert.equal(p.done, 0)
  })

  it('progress counts done today vs still open', () => {
    let state = emptyDailyTasksState()
    state = addTask(state, { title: 'A', hour: 8 }, now)
    state = addTask(state, { title: 'B', hour: 9 }, now)
    let p = progressSummary(state, now)
    assert.deepEqual(p, { done: 0, open: 2, total: 2, pct: 0 })
    state = completeTask(state, state.tasks[0]!.id, now)
    p = progressSummary(state, now)
    assert.deepEqual(p, { done: 1, open: 1, total: 2, pct: 50 })
    state = completeTask(state, state.tasks[0]!.id, now)
    p = progressSummary(state, now)
    assert.deepEqual(p, { done: 2, open: 0, total: 2, pct: 100 })
  })

  it('schedules tomorrow without counting it today', () => {
    const tomorrowKey = dateKey(new Date(2026, 8, 21))
    const state = addTask(emptyDailyTasksState(), { title: 'Groceries', scheduledOn: tomorrowKey }, now)
    assert.equal(state.tasks[0]!.scheduledOn, tomorrowKey)
    assert.equal(tasksDueOnDay(state, now).length, 0)
    assert.equal(progressSummary(state, now).open, 0)
    assert.equal(tasksDueOnDay(state, new Date(2026, 8, 21, 8, 0)).length, 1)
  })

  it('keeps a past task unfinished and moves it without copying', () => {
    let state = stateWithTask({ title: 'CCTV' }, now)
    const id = state.tasks[0]!.id
    const later = new Date(2026, 8, 21, 8, 0, 0)
    assert.equal(overdueTasks(state, later).length, 1)
    assert.equal(tasksDueOnDay(state, later).length, 0)
    state = rescheduleTask(state, id, dateKey(later), later)
    assert.equal(state.tasks.length, 1)
    assert.equal(state.tasks[0]!.id, id)
    assert.equal(tasksDueOnDay(state, later)[0]!.title, 'CCTV')
    assert.equal(overdueTasks(state, later).length, 0)
  })

  it('completing a weekday repeat advances the same task', () => {
    let state = stateWithTask({ title: 'Meds', weekdays: [0, 1] }, now)
    const id = state.tasks[0]!.id
    state = completeTask(state, id, now)
    assert.equal(state.tasks.length, 1)
    assert.equal(state.tasks[0]!.id, id)
    assert.equal(state.tasks[0]!.scheduledOn, '2026-09-21')
    assert.equal(state.completed[0]!.seriesId, id)
    assert.equal(tasksDueOnDay(state, now).length, 0)
    state = completeTask(state, id, now)
    assert.equal(state.completed.length, 1)
  })

  it('progress includes open reminders in the left count', () => {
    let state = emptyDailyTasksState()
    state = addTask(state, { title: 'Gift', hour: 8 }, now)
    const p = progressSummary(state, now, 1)
    assert.deepEqual(p, { done: 0, open: 2, total: 2, pct: 0 })
  })

  it('reorders tasks and reflows sortOrder', () => {
    let state = emptyDailyTasksState()
    state = addTask(state, { title: 'A' }, now)
    state = addTask(state, { title: 'B' }, now)
    state = addTask(state, { title: 'C' }, now)
    const cId = state.tasks[2]!.id
    state = reorderTask(state, cId, 0)
    assert.deepEqual(state.tasks.map(t => t.title), ['C', 'A', 'B'])
    assert.deepEqual(state.tasks.map(t => t.sortOrder), [0, 1, 2])
  })

  it('updates task time + weekdays', () => {
    let state = stateWithTask({}, now)
    const id = state.tasks[0]!.id
    state = updateTask(state, id, { hour: 20, minute: 30, weekdays: [6, 0] }, now)
    assert.equal(state.tasks[0]!.hour, 20)
    assert.equal(state.tasks[0]!.minute, 30)
    assert.deepEqual(state.tasks[0]!.weekdays, [0, 6])
    state = updateTask(state, id, { hour: null }, now)
    assert.equal(state.tasks[0]!.hour, null)
    assert.equal(state.tasks[0]!.minute, null)
  })

  it('removes a task without archiving', () => {
    let state = stateWithTask({}, now)
    const id = state.tasks[0]!.id
    state = removeTask(state, id)
    assert.equal(state.tasks.length, 0)
    assert.equal(state.completed.length, 0)
  })

  it('formats time + weekday labels', () => {
    assert.equal(formatTaskTimeLabel(8, 0), '8:00 am')
    assert.equal(formatTaskTimeLabel(null, null), 'Throughout the day')
    assert.equal(formatWeekdaysLabel(undefined), 'Every day until done')
    assert.equal(formatWeekdaysLabel([1, 2, 3, 4, 5]), 'Weekdays until done')
    assert.match(formatTaskSubtitle(stateWithTask().tasks[0]!), /8:00 am/)
  })

  it('migrates legacy completedOn tasks into the archive', () => {
    const parsed = normalizeDailyTasksState({
      enabled: true,
      tasks: [
        { id: 'open-1', title: 'Still open', hour: 9, minute: 0, sortOrder: 0, createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z' },
        { id: 'done-1', title: 'Was checked', hour: 8, minute: 0, completedOn: '2026-09-19', sortOrder: 1, createdAt: '2026-09-19T00:00:00.000Z', updatedAt: '2026-09-19T10:00:00.000Z' },
      ],
    })
    assert.equal(parsed.tasks.length, 1)
    assert.equal(parsed.tasks[0]!.id, 'open-1')
    assert.equal(parsed.completed.length, 1)
    assert.equal(parsed.completed[0]!.id, 'done-1')
    assert.deepEqual(parsed.history['2026-09-19'], ['done-1'])
  })
})

describe('dailyTasks streaks', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0)

  it('overall streak counts consecutive days with completions', () => {
    let state = emptyDailyTasksState()
    state = {
      ...state,
      history: {
        '2026-09-19': ['x'],
        '2026-09-18': ['y'],
      },
      obligationDays: {
        '2026-09-19': true,
        '2026-09-18': true,
      },
    }
    // Today grace (no completion yet) — streak is 2 from yesterday back
    assert.equal(overallStreak(state, now), 2)
  })

  it('skips days with no tasks (no obligation); one completion is enough', () => {
    let state = emptyDailyTasksState()
    state = {
      ...state,
      history: {
        '2026-09-20': ['a'], // today: 1 done
        '2026-09-18': ['b'], // Mon: 1 done
        // 2026-09-19 (Sat): no tasks, no obligation — skip
      },
      obligationDays: {
        '2026-09-20': true,
        '2026-09-18': true,
      },
    }
    assert.equal(overallStreak(state, now), 2)
  })

  it('breaks when an obligation day had zero completions', () => {
    let state = emptyDailyTasksState()
    state = {
      ...state,
      history: {
        '2026-09-20': ['a'],
        // 2026-09-19: had open work, completed none
        '2026-09-18': ['b'],
      },
      obligationDays: {
        '2026-09-20': true,
        '2026-09-19': true,
        '2026-09-18': true,
      },
    }
    assert.equal(overallStreak(state, now), 1)
  })

  it('dayCompletion classifies none/partial/complete', () => {
    let state = emptyDailyTasksState()
    state = addTask(state, { title: 'A', hour: 8 }, now)
    state = completeTask(state, state.tasks[0]!.id, now)
    assert.equal(dayCompletion(state, now, now), 'complete')

    state = addTask(state, { title: 'B', hour: 9 }, now)
    assert.equal(dayCompletion(state, now, now), 'partial')

    assert.equal(dayCompletion(state, new Date(2026, 8, 17), now), 'none')
  })
})

describe('dailyTask notifications', () => {
  const now = new Date(2026, 8, 20, 7, 0, 0)

  it('expoWeekday maps 0..6 -> 1..7', () => {
    assert.equal(expoWeekday(0), 1)
    assert.equal(expoWeekday(6), 7)
  })

  it('builds a single DAILY trigger for every-day tasks', () => {
    const task = stateWithTask({}, now).tasks[0]!
    const descriptors = buildTaskTriggerDescriptors(task)
    assert.equal(descriptors.length, 1)
    assert.equal(descriptors[0]!.kind, 'daily')
  })

  it('builds one WEEKLY trigger per weekday for subsets', () => {
    const task = stateWithTask({ weekdays: [1, 3, 5] }, now).tasks[0]!
    const descriptors = buildTaskTriggerDescriptors(task)
    assert.equal(descriptors.length, 3)
  })

  it('builds no triggers for all-day tasks', () => {
    const task = stateWithTask({ hour: null, minute: null }, now).tasks[0]!
    assert.deepEqual(buildTaskTriggerDescriptors(task), [])
  })

  it('summary lists open tasks; completed ones are excluded', () => {
    assert.equal(buildDailySummaryContent(emptyDailyTasksState(), now), null)
    let state = stateWithTask({}, now)
    state = addTask(state, { title: 'Drink water' }, now)
    state = completeTask(state, state.tasks[0]!.id, now)
    const content = buildDailySummaryContent(state, now)
    assert.ok(content)
    assert.match(content!.body, /1 open task/)
    assert.match(content!.body, /Drink water/)
  })
})
