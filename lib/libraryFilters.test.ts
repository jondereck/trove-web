import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { partitionPinnedSaves, sortByPinnedThenCreated } from './libraryFilters'
import type { Save } from './types'

function save(id: string, pinned: boolean, createdAt: string): Save {
  return {
    id,
    user_id: 'u',
    title: id,
    type: 'link',
    tags: [],
    is_inbox: false,
    is_pinned: pinned,
    created_at: createdAt,
  }
}

describe('sortByPinnedThenCreated', () => {
  it('orders pinned saves before unpinned, newest first within each group', () => {
    const ordered = sortByPinnedThenCreated([
      save('a', false, '2026-01-01T00:00:00.000Z'),
      save('b', true, '2026-01-02T00:00:00.000Z'),
      save('c', true, '2026-01-03T00:00:00.000Z'),
      save('d', false, '2026-01-04T00:00:00.000Z'),
    ])

    assert.deepEqual(
      ordered.map(s => s.id),
      ['c', 'b', 'd', 'a'],
    )
  })
})

describe('partitionPinnedSaves', () => {
  it('splits pinned from the rest without dropping items', () => {
    const saves = [
      save('a', false, '2026-01-01T00:00:00.000Z'),
      save('b', true, '2026-01-02T00:00:00.000Z'),
      save('c', true, '2026-01-03T00:00:00.000Z'),
    ]

    const { pinned, rest } = partitionPinnedSaves(saves)

    assert.deepEqual(
      pinned.map(s => s.id),
      ['c', 'b'],
    )
    assert.deepEqual(
      rest.map(s => s.id),
      ['a'],
    )
  })
})
