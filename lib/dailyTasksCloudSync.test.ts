import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { emptyDailyTasksState, type DailyTasksState } from './dailyTasks'
import {
  dailyTasksStateFromCloudRow,
  dailyTasksStateToCloudPayload,
  isMeaningfulDailyTasksState,
  mergeDailyTasksState,
  stateUpdatedAtMs,
} from './dailyTasksCloudSync'

function base(partial: Partial<DailyTasksState> = {}): DailyTasksState {
  return {
    ...emptyDailyTasksState(),
    enabled: true,
    updatedAt: '2026-09-20T10:00:00.000Z',
    ...partial,
  }
}

describe('dailyTasksCloudSync', () => {
  it('unions open tasks from both devices and completed + obligation days', () => {
    const local = base({
      updatedAt: '2026-09-21T12:00:00.000Z',
      tasks: [{
        id: 't1',
        title: 'Local task',
        hour: 8,
        minute: 0,
        sortOrder: 0,
        createdAt: '2026-09-21T08:00:00.000Z',
        updatedAt: '2026-09-21T08:00:00.000Z',
      }],
      completed: [{
        id: 'c-local',
        title: 'Local done',
        completedOn: '2026-09-21',
        completedAt: '2026-09-21T09:00:00.000Z',
      }],
      obligationDays: { '2026-09-21': true },
    })
    const remote = base({
      updatedAt: '2026-09-20T12:00:00.000Z',
      tasks: [{
        id: 't2',
        title: 'Remote task',
        hour: 9,
        minute: 0,
        sortOrder: 0,
        createdAt: '2026-09-20T08:00:00.000Z',
        updatedAt: '2026-09-20T08:00:00.000Z',
      }],
      completed: [{
        id: 'c-remote',
        title: 'Remote done',
        completedOn: '2026-09-20',
        completedAt: '2026-09-20T09:00:00.000Z',
      }],
      obligationDays: { '2026-09-20': true },
    })

    const merged = mergeDailyTasksState(local, remote)
    assert.deepEqual(merged.tasks.map(t => t.id).sort(), ['t1', 't2'])
    assert.deepEqual(
      merged.completed.map(c => c.id).sort(),
      ['c-local', 'c-remote'],
    )
    assert.equal(merged.obligationDays['2026-09-20'], true)
    assert.equal(merged.obligationDays['2026-09-21'], true)
    assert.ok(stateUpdatedAtMs(merged) >= stateUpdatedAtMs(local))
  })

  it('keeps a desktop-created task when phone local doc clock is newer', () => {
    const phone = base({
      updatedAt: '2026-10-08T14:00:00.000Z',
      tasks: [{
        id: 'phone-only',
        title: 'Phone task',
        hour: null,
        minute: null,
        sortOrder: 0,
        createdAt: '2026-10-08T10:00:00.000Z',
        updatedAt: '2026-10-08T10:00:00.000Z',
      }],
    })
    const desktop = base({
      updatedAt: '2026-10-08T13:50:00.000Z',
      tasks: [
        {
          id: 'phone-only',
          title: 'Phone task',
          hour: null,
          minute: null,
          sortOrder: 0,
          createdAt: '2026-10-08T10:00:00.000Z',
          updatedAt: '2026-10-08T10:00:00.000Z',
        },
        {
          id: 'desktop-new',
          title: 'test',
          hour: null,
          minute: null,
          sortOrder: 1,
          createdAt: '2026-10-08T13:50:00.000Z',
          updatedAt: '2026-10-08T13:50:00.000Z',
        },
      ],
    })
    const merged = mergeDailyTasksState(phone, desktop)
    assert.deepEqual(merged.tasks.map(t => t.id).sort(), ['desktop-new', 'phone-only'])
  })

  it('lets phone tasks win over a newer empty web Turn-on shell', () => {
    const phone = base({
      updatedAt: '2026-10-01T10:00:00.000Z',
      tasks: [{
        id: 'phone',
        title: 'From phone',
        hour: 8,
        minute: 0,
        sortOrder: 0,
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
      }],
    })
    const webShell = base({
      updatedAt: '2026-10-08T13:01:57.000Z',
      enabled: true,
      tasks: [],
      completed: [],
      obligationDays: {},
    })
    assert.equal(isMeaningfulDailyTasksState(webShell), false)
    const merged = mergeDailyTasksState(webShell, phone)
    assert.equal(merged.tasks[0]?.id, 'phone')
    assert.equal(merged.enabled, true)
  })

  it('does not resurrect a task removed on the other device', () => {
    const desktop = base({
      updatedAt: '2026-10-08T15:00:00.000Z',
      tasks: [],
      removedTaskIds: { gone: '2026-10-08T15:00:00.000Z' },
    })
    const phone = base({
      updatedAt: '2026-10-08T14:00:00.000Z',
      tasks: [{
        id: 'gone',
        title: 'Deleted elsewhere',
        hour: null,
        minute: null,
        sortOrder: 0,
        createdAt: '2026-10-08T10:00:00.000Z',
        updatedAt: '2026-10-08T10:00:00.000Z',
      }],
    })
    const merged = mergeDailyTasksState(phone, desktop)
    assert.equal(merged.tasks.length, 0)
    assert.equal(merged.removedTaskIds.gone, '2026-10-08T15:00:00.000Z')
  })

  it('lets meaningful remote win over virgin local browser state', () => {
    const local = emptyDailyTasksState()
    const remote = base({
      updatedAt: '2026-09-20T12:00:00.000Z',
      tasks: [{
        id: 'phone',
        title: 'From phone',
        hour: 8,
        minute: 0,
        sortOrder: 0,
        createdAt: '2026-09-20T08:00:00.000Z',
        updatedAt: '2026-09-20T08:00:00.000Z',
      }],
    })
    const merged = mergeDailyTasksState(local, remote)
    assert.equal(merged.tasks[0]?.id, 'phone')
    assert.equal(merged.enabled, true)
  })

  it('round-trips cloud payload', () => {
    const state = base({
      completed: [{
        id: 'c1',
        title: 'Done',
        completedOn: '2026-09-21',
        completedAt: '2026-09-21T10:00:00.000Z',
      }],
      obligationDays: { '2026-09-21': true },
    })
    const payload = dailyTasksStateToCloudPayload(state, 'user-1')
    assert.equal(payload.user_id, 'user-1')
    assert.equal(payload.updated_at, state.updatedAt)
    const back = dailyTasksStateFromCloudRow(payload)
    assert.ok(back)
    assert.equal(back!.completed[0]!.id, 'c1')
    assert.equal(back!.obligationDays['2026-09-21'], true)
  })
})
