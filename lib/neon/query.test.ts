import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyState, scopedState, whereSql } from './query'

test('a save read is limited to the signed-in user', () => {
  const state = emptyState('saves')
  state.filters.push({ kind: 'cmp', op: 'eq', column: 'is_inbox', value: false })
  const scoped = scopedState(state, '11111111-1111-4111-8111-111111111111')
  const values: unknown[] = []
  const sql = whereSql(scoped, values)
  assert.match(sql, /user_id = \$2/)
  assert.equal(values[1], '11111111-1111-4111-8111-111111111111')
})
