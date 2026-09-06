import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  bulkReadAction,
  savesFromIds,
  selectAllIds,
  toggleSelectedId,
} from './selectionMode'

describe('selectionMode', () => {
  it('toggles ids in and out of the set', () => {
    const one = toggleSelectedId(new Set(), 'a')
    assert.deepEqual([...one], ['a'])
    assert.deepEqual([...toggleSelectedId(one, 'a')], [])
  })

  it('selects all ids', () => {
    assert.deepEqual([...selectAllIds(['a', 'b'])], ['a', 'b'])
  })

  it('filters saves by selected ids', () => {
    const rows = [{ id: '1' }, { id: '2' }, { id: '3' }]
    assert.deepEqual(savesFromIds(rows, new Set(['2', '9'])), [{ id: '2' }])
  })

  it('picks mark-read when any selected is unread', () => {
    assert.deepEqual(
      bulkReadAction([{ is_viewed: true }, { is_viewed: false }]),
      { label: 'Mark as read', is_viewed: true },
    )
    assert.deepEqual(
      bulkReadAction([{ is_viewed: true }]),
      { label: 'Mark as unread', is_viewed: false },
    )
  })
})
