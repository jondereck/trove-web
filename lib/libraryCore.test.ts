import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { countsByType, filterLibrarySaves } from './libraryCore'
import type { Save } from './types'

const sample: Save[] = [
  {
    id: '1',
    user_id: 'u',
    title: 'Note',
    type: 'note',
    tags: [],
    is_inbox: false,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    user_id: 'u',
    title: 'Inbox',
    type: 'link',
    tags: [],
    is_inbox: true,
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: '3',
    user_id: 'u',
    title: 'Vault',
    type: 'note',
    tags: [],
    is_inbox: false,
    is_vault: true,
    created_at: '2026-01-03T00:00:00Z',
  },
]

describe('libraryCore', () => {
  it('filters inbox and vault saves', () => {
    assert.equal(filterLibrarySaves(sample).length, 1)
    assert.equal(filterLibrarySaves(sample)[0]?.id, '1')
  })

  it('counts by type', () => {
    const counts = countsByType(sample)
    assert.equal(counts.total, 1)
    assert.equal(counts.notes, 1)
    assert.equal(counts.links, 0)
  })
})
