import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { inboxCountLabel, selectInboxSaves } from './inbox'
import type { Save } from './types'

function save(partial: Partial<Save> & Pick<Save, 'id' | 'created_at'>): Save {
  return {
    user_id: 'u',
    title: partial.id,
    type: 'note',
    tags: [],
    is_inbox: true,
    ...partial,
  }
}

describe('selectInboxSaves', () => {
  it('keeps non-vault inbox saves, pinned then newest', () => {
    const rows = selectInboxSaves([
      save({ id: 'library', is_inbox: false, created_at: '2026-03-01T00:00:00Z' }),
      save({ id: 'vault-inbox', is_vault: true, created_at: '2026-04-01T00:00:00Z' }),
      save({ id: 'older', created_at: '2026-01-01T00:00:00Z' }),
      save({ id: 'newer', created_at: '2026-02-01T00:00:00Z' }),
      save({ id: 'pinned-old', is_pinned: true, created_at: '2026-01-15T00:00:00Z' }),
    ])
    assert.deepEqual(rows.map(row => row.id), ['pinned-old', 'newer', 'older'])
  })
})

describe('inboxCountLabel', () => {
  it('hides zero and caps above nine', () => {
    assert.equal(inboxCountLabel(0), null)
    assert.equal(inboxCountLabel(1), '1')
    assert.equal(inboxCountLabel(9), '9')
    assert.equal(inboxCountLabel(10), '9+')
  })
})
