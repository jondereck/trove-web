import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { partitionPinned } from './pinnedSections'

describe('partitionPinned', () => {
  it('splits pinned collections from the rest', () => {
    const items = [
      { id: 'a', is_pinned: false },
      { id: 'b', is_pinned: true },
      { id: 'c', is_pinned: undefined },
    ]

    const { pinned, unpinned } = partitionPinned(items)

    assert.deepEqual(
      pinned.map(i => i.id),
      ['b'],
    )
    assert.deepEqual(
      unpinned.map(i => i.id),
      ['a', 'c'],
    )
  })
})
