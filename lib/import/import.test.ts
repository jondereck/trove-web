import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseBackupJson } from './backupJson'
import { isRaindropCsv, previewRaindropCsv } from './raindropCsv'

describe('backupJson', () => {
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

describe('raindropCsv', () => {
  it('detects Raindrop header', () => {
    const csv = 'url,title,folder,created\nhttps://ex.com,Hi,Reading,2026-01-01\n'
    assert.equal(isRaindropCsv(csv), true)
  })

  it('previews Raindrop rows as saves', () => {
    const csv = [
      'url,title,note,excerpt,folder,tags,created,cover,highlights,favorite',
      'https://ex.com/post,Example,,Caption,Reading,tag1,2026-01-02,,,false',
    ].join('\n')
    const { saves } = previewRaindropCsv(csv)
    assert.equal(saves.length, 1)
    assert.equal(saves[0]?.title, 'Example')
    assert.equal(saves[0]?.tags.includes('Reading'), true)
  })
})
