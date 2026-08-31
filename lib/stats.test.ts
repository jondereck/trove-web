import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Save } from './types'
import { activityByMonth, hasEnoughStats, savesByType, topTags } from './stats'

function save(partial: Partial<Save> & Pick<Save, 'id' | 'type'>): Save {
  return {
    user_id: 'u1',
    title: 'Test',
    tags: [],
    is_inbox: false,
    created_at: '2026-08-15T12:00:00.000Z',
    ...partial,
  }
}

describe('stats', () => {
  it('counts saves by type excluding inbox and vault', () => {
    const rows = savesByType([
      save({ id: '1', type: 'link' }),
      save({ id: '2', type: 'note' }),
      save({ id: '3', type: 'note' }),
      save({ id: '4', type: 'link', is_inbox: true }),
      save({ id: '5', type: 'image', is_vault: true }),
    ])
    assert.deepEqual(rows, [
      { type: 'link', label: 'Links', count: 1 },
      { type: 'note', label: 'Notes', count: 2 },
    ])
  })

  it('groups activity into recent months', () => {
    const rows = activityByMonth(
      [
        save({ id: '1', type: 'link', created_at: '2026-08-10T00:00:00.000Z' }),
        save({ id: '2', type: 'note', created_at: '2026-08-20T00:00:00.000Z' }),
        save({ id: '3', type: 'link', created_at: '2026-07-05T00:00:00.000Z' }),
      ],
      3,
      new Date('2026-08-31T00:00:00.000Z'),
    )
    assert.equal(rows.length, 3)
    assert.equal(rows[2].count, 2)
    assert.equal(rows[1].count, 1)
    assert.equal(rows[0].count, 0)
  })

  it('ranks top tags', () => {
    const rows = topTags([
      save({ id: '1', type: 'link', tags: ['react', 'docs'] }),
      save({ id: '2', type: 'note', tags: ['react'] }),
      save({ id: '3', type: 'note', tags: ['React'] }),
    ])
    assert.deepEqual(rows, [
      { tag: 'react', count: 3 },
      { tag: 'docs', count: 1 },
    ])
  })

  it('requires at least five library saves for charts', () => {
    assert.equal(hasEnoughStats([save({ id: '1', type: 'link' })]), false)
    assert.equal(
      hasEnoughStats(
        Array.from({ length: 5 }, (_, index) => save({ id: String(index), type: 'link' })),
      ),
      true,
    )
  })
})
