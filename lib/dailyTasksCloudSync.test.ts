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
  it('prefers newer open tasks but unions completed + obligation days for streak', () => {
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
    assert.equal(merged.tasks.length, 1)
    assert.equal(merged.tasks[0]!.id, 't1')
    assert.deepEqual(
      merged.completed.map(c => c.id).sort(),
      ['c-local', 'c-remote'],
    )
    assert.equal(merged.obligationDays['2026-09-20'], true)
    assert.equal(merged.obligationDays['2026-09-21'], true)
    assert.ok(stateUpdatedAtMs(merged) >= stateUpdatedAtMs(local))
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
