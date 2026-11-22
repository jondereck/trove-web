import assert from 'node:assert/strict'
import test from 'node:test'
import { loadSyncWatch, syncWatchChanged, type SyncWatchPayload } from './syncWatch'

test('syncWatchChanged reports only moved buckets', () => {
  const base: SyncWatchPayload = {
    saves: { maxTs: '2026-11-22T00:00:00.000Z', count: 10 },
    collections: { maxTs: '2026-11-22T00:00:00.000Z', count: 2 },
    dailyTasks: { maxTs: '2026-11-22T00:00:00.000Z', count: 1 },
  }
  assert.deepEqual(syncWatchChanged(null, base), ['saves', 'collections', 'dailyTasks'])
  assert.deepEqual(syncWatchChanged(base, base), [])
  assert.deepEqual(
    syncWatchChanged(base, {
      ...base,
      saves: { maxTs: '2026-11-22T01:00:00.000Z', count: 11 },
    }),
    ['saves'],
  )
})

test('loadSyncWatch runs three scoped watermark queries', async () => {
  const seen: string[] = []
  const payload = await loadSyncWatch(async (sql, params) => {
    seen.push(sql)
    assert.equal(params[0], 'user-1')
    if (sql.includes('from public.saves')) {
      return { rows: [{ count: 3, max_ts: new Date('2026-11-22T02:00:00.000Z') }] }
    }
    if (sql.includes('from public.collections')) {
      return { rows: [{ count: 1, max_ts: '2026-11-22T03:00:00.000Z' }] }
    }
    return { rows: [{ count: 0, max_ts: null }] }
  }, 'user-1')

  assert.equal(seen.length, 3)
  assert.match(seen[0]!, /is_vault = false/)
  assert.deepEqual(payload, {
    saves: { maxTs: '2026-11-22T02:00:00.000Z', count: 3 },
    collections: { maxTs: '2026-11-22T03:00:00.000Z', count: 1 },
    dailyTasks: { maxTs: null, count: 0 },
  })
})
