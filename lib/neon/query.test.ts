import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyState, scopedState, upsertOwnerGuard, whereSql } from './query'

test('a save read is limited to the signed-in user', () => {
  const state = emptyState('saves')
  state.filters.push({ kind: 'cmp', op: 'eq', column: 'is_inbox', value: false })
  const scoped = scopedState(state, '11111111-1111-4111-8111-111111111111')
  const values: unknown[] = []
  const sql = whereSql(scoped, values)
  assert.match(sql, /user_id = \$2/)
  assert.equal(values[1], '11111111-1111-4111-8111-111111111111')
})

test('keyset cursor emits a strict row comparison after the owner scope', () => {
  const state = emptyState('saves')
  state.filters.push({ kind: 'cmp', op: 'eq', column: 'is_inbox', value: false })
  state.filters.push({
    kind: 'rowLt',
    columns: ['is_pinned', 'created_at', 'id'],
    values: [false, '2026-11-19T00:00:00.000Z', 'last-id'],
  })
  const scoped = scopedState(state, '11111111-1111-4111-8111-111111111111')
  const values: unknown[] = []
  const sql = whereSql(scoped, values)
  assert.match(sql, /\(is_pinned, created_at, id\) < \(\$2, \$3, \$4\)/)
  assert.deepEqual(values.slice(1, 4), [false, '2026-11-19T00:00:00.000Z', 'last-id'])
})

test('an upsert can only overwrite the signed-in user row', () => {
  assert.equal(upsertOwnerGuard('saves', 'id'), 'saves.user_id = excluded.user_id')
  assert.equal(upsertOwnerGuard('profiles', 'id'), 'profiles.id = excluded.id')
  assert.equal(upsertOwnerGuard('saves', null), null)
  assert.equal(upsertOwnerGuard('collection_share_members', 'id'), null)
})
