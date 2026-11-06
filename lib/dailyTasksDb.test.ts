import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeDailyTasksState, type DailyTasksState } from './dailyTasks'
import type { CloudDailyTasksRow } from './dailyTasksCloudSync'
import {
  __resetDailyTasksCloudTableProbe,
  syncDailyTasksWithCloud,
} from './dailyTasksDb'

type Call = { op: 'probe' | 'fetch' | 'upsert' }

/** PostgREST sends timestamptz as an offset, not the `Z` form we write. */
function asPostgrest(value: string): string {
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return value
  return new Date(ms).toISOString().replace('Z', '+00:00')
}

function meaningfulState(updatedAt: string): DailyTasksState {
  return normalizeDailyTasksState({
    enabled: true,
    updatedAt,
    tasks: [{
      id: 't1',
      title: 'Water plants',
      hour: 8,
      minute: 0,
      sortOrder: 0,
      createdAt: '2026-10-20T08:00:00.000Z',
      updatedAt: '2026-10-20T08:00:00.000Z',
      scheduledOn: '2026-10-20',
    }],
    obligationDays: { '2026-10-20': true },
  })
}

function fakeClient(initial: CloudDailyTasksRow | null) {
  let row = initial
  const calls: Call[] = []
  const supabase = {
    from(table: string) {
      if (table !== 'daily_tasks') throw new Error(`unexpected table ${table}`)
      return {
        select() {
          return {
            limit() {
              calls.push({ op: 'probe' })
              return Promise.resolve({ data: row ? [{ user_id: row.user_id }] : [], error: null })
            },
            eq() {
              return {
                maybeSingle() {
                  calls.push({ op: 'fetch' })
                  if (!row) return Promise.resolve({ data: null, error: null })
                  return Promise.resolve({
                    data: { ...row, updated_at: asPostgrest(row.updated_at) },
                    error: null,
                  })
                },
              }
            },
          }
        },
        upsert(payload: CloudDailyTasksRow) {
          calls.push({ op: 'upsert' })
          row = {
            user_id: payload.user_id,
            state: payload.state,
            updated_at: payload.updated_at,
          }
          return Promise.resolve({ error: null })
        },
      }
    },
  }
  return {
    supabase: supabase as unknown as SupabaseClient,
    calls,
  }
}

describe('syncDailyTasksWithCloud', { concurrency: 1 }, () => {
  beforeEach(() => {
    __resetDailyTasksCloudTableProbe()
  })

  it('does not upsert or re-probe when the only difference is the timestamptz spelling', async () => {
    const local = meaningfulState('2026-10-26T11:21:01.246Z')
    const { supabase, calls } = fakeClient({
      user_id: 'user-1',
      state: local,
      updated_at: '2026-10-26T11:21:01.246Z',
    })

    await syncDailyTasksWithCloud(supabase, 'user-1', local)
    await syncDailyTasksWithCloud(supabase, 'user-1', local)

    assert.equal(calls.filter(call => call.op === 'upsert').length, 0)
    assert.equal(calls.filter(call => call.op === 'probe').length, 1)
    assert.equal(calls.filter(call => call.op === 'fetch').length, 2)
  })

  it('still upserts when local has a task the cloud row does not', async () => {
    const remote = meaningfulState('2026-10-26T11:21:01.246Z')
    const local = normalizeDailyTasksState({
      ...remote,
      updatedAt: '2026-10-26T12:00:00.000Z',
      tasks: [
        ...remote.tasks,
        {
          id: 't2',
          title: 'Stretch',
          hour: null,
          minute: null,
          sortOrder: 1,
          createdAt: '2026-10-26T12:00:00.000Z',
          updatedAt: '2026-10-26T12:00:00.000Z',
          scheduledOn: '2026-10-26',
        },
      ],
    })
    const { supabase, calls } = fakeClient({
      user_id: 'user-1',
      state: remote,
      updated_at: remote.updatedAt ?? '2026-10-26T11:21:01.246Z',
    })

    const merged = await syncDailyTasksWithCloud(supabase, 'user-1', local)
    assert.equal(merged.tasks.some(task => task.id === 't2'), true)
    assert.equal(calls.filter(call => call.op === 'upsert').length, 1)
  })

  it('probes again after the table was missing, then caches a hit', async () => {
    let missing = true
    const calls: Call[] = []
    const supabase = {
      from() {
        return {
          select() {
            return {
              limit() {
                calls.push({ op: 'probe' })
                if (missing) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Could not find the table daily_tasks in the schema cache' },
                  })
                }
                return Promise.resolve({ data: [{ user_id: 'user-1' }], error: null })
              },
              eq() {
                return {
                  maybeSingle() {
                    calls.push({ op: 'fetch' })
                    return Promise.resolve({ data: null, error: null })
                  },
                }
              },
            }
          },
          upsert() {
            calls.push({ op: 'upsert' })
            return Promise.resolve({ error: null })
          },
        }
      },
    } as unknown as SupabaseClient
    const local = meaningfulState('2026-10-26T11:21:01.246Z')

    await syncDailyTasksWithCloud(supabase, 'user-1', local)
    assert.equal(calls.filter(call => call.op === 'probe').length, 1)
    assert.equal(calls.filter(call => call.op === 'fetch').length, 0)

    missing = false
    await syncDailyTasksWithCloud(supabase, 'user-1', local)
    await syncDailyTasksWithCloud(supabase, 'user-1', local)
    assert.equal(calls.filter(call => call.op === 'probe').length, 2)
    assert.equal(calls.filter(call => call.op === 'fetch').length, 2)
  })
})
