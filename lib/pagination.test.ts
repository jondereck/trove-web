import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { paginateLocalSaves, hasMorePages } from './pagination'
import type { Save } from './types'

const saves: Save[] = Array.from({ length: 30 }, (_, i) => ({
  id: `save-${i}`,
  user_id: 'u',
  title: `Save ${i}`,
  type: 'link',
  tags: [],
  is_inbox: false,
  created_at: new Date(Date.UTC(2026, 7, 1, 0, 0, i)).toISOString(),
}))

describe('pagination', () => {
  it('returns first page and total', () => {
    const { page, total } = paginateLocalSaves(saves, 0, 24)
    assert.equal(total, 30)
    assert.equal(page.length, 24)
  })

  it('returns second page', () => {
    const { page, total } = paginateLocalSaves(saves, 24, 20)
    assert.equal(total, 30)
    assert.equal(page.length, 6)
  })

  it('detects remaining pages', () => {
    assert.equal(hasMorePages(24, 30), true)
    assert.equal(hasMorePages(30, 30), false)
  })
})
