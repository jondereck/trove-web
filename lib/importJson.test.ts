import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseBackupJson } from './importJson'

describe('importJson', () => {
  it('parses backup json and filters library saves', () => {
    const raw = JSON.stringify({
      version: 2,
      exportedAt: '2026-01-01',
      saves: [
        {
          id: 'a',
          user_id: 'u',
          title: 'Keep',
          type: 'note',
          tags: [],
          is_inbox: false,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'b',
          user_id: 'u',
          title: 'Skip',
          type: 'link',
          tags: [],
          is_inbox: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      collections: [],
    })
    const result = parseBackupJson(raw)
    assert.equal(result.saves.length, 1)
    assert.equal(result.saves[0]?.title, 'Keep')
  })

  it('throws on invalid backup', () => {
    assert.throws(() => parseBackupJson('{}'), /missing saves/)
  })
})
