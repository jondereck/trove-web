import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  nextRecentIds,
  sortCollectionsByRecent,
} from './recentCollections'

describe('nextRecentIds', () => {
  it('prepends and dedupes, capping at 8', () => {
    const prev = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    assert.deepEqual(nextRecentIds(prev, 'b'), ['b', 'a', 'c', 'd', 'e', 'f', 'g', 'h'])
    assert.deepEqual(nextRecentIds(prev, 'z'), ['z', 'a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  it('ignores empty ids', () => {
    assert.deepEqual(nextRecentIds(['a'], ''), ['a'])
  })
})

describe('sortCollectionsByRecent', () => {
  it('orders by recent rank then name', () => {
    const cols = [
      { id: '1', name: 'Zebra' },
      { id: '2', name: 'Alpha' },
      { id: '3', name: 'Beta' },
    ]
    const sorted = sortCollectionsByRecent(cols, ['3', '1'])
    assert.deepEqual(sorted.map(c => c.id), ['3', '1', '2'])
  })
})
