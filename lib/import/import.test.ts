import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { parseBackupJson } from './backupJson'
import { parseBackupZip } from './backupZip'
import { parseImportFile } from './index'
import { isRaindropCsv, previewRaindropCsv } from './raindropCsv'

const MOBILE_V2_FIXTURE = {
  version: 2,
  exportedAt: '2026-11-06T00:00:00.000Z',
  collections: [{
    id: 'col-1',
    user_id: 'guest',
    name: 'Recipes',
    icon: 'folder-outline',
    color: '#c0613b',
    created_at: '2026-01-01T00:00:00.000Z',
  }],
  saves: [
    {
      id: 'lib-note',
      user_id: 'guest',
      title: 'Soup',
      type: 'note' as const,
      content: 'simmer',
      tags: ['food'],
      is_inbox: false,
      collection_id: 'col-1',
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'inbox-link',
      user_id: 'guest',
      title: 'Unsorted article',
      type: 'link' as const,
      url: 'https://example.com/post',
      tags: [],
      is_inbox: true,
      created_at: '2026-01-03T00:00:00.000Z',
    },
    {
      id: 'photo',
      user_id: 'guest',
      title: 'Kitchen',
      type: 'image' as const,
      image_url: 'trove-media://photo.jpg',
      tags: [],
      is_inbox: false,
      created_at: '2026-01-04T00:00:00.000Z',
    },
    {
      id: 'vault-note',
      user_id: 'guest',
      title: 'Secret',
      type: 'note' as const,
      tags: [],
      is_inbox: false,
      is_vault: true,
      created_at: '2026-01-05T00:00:00.000Z',
    },
  ],
}

describe('backupJson', () => {
  it('parses backup json and keeps inbox while dropping vault', () => {
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
          title: 'Inbox',
          type: 'link',
          tags: [],
          is_inbox: true,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'c',
          user_id: 'u',
          title: 'Vault',
          type: 'note',
          tags: [],
          is_inbox: false,
          is_vault: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      collections: [],
    })
    const result = parseBackupJson(raw)
    assert.equal(result.saves.length, 2)
    assert.deepEqual(result.saves.map(s => s.title).sort(), ['Inbox', 'Keep'])
  })

  it('throws on invalid backup', () => {
    assert.throws(() => parseBackupJson('{}'), /missing saves/)
  })

  it('accepts a mobile v2 payload, keeps inbox, and drops vault', () => {
    const result = parseBackupJson(JSON.stringify(MOBILE_V2_FIXTURE))
    assert.equal(result.collections.length, 1)
    assert.equal(result.collections[0]?.name, 'Recipes')
    assert.deepEqual(result.saves.map(s => s.id).sort(), ['inbox-link', 'lib-note', 'photo'])
    assert.equal(result.saves.find(s => s.id === 'photo')?.image_url, 'trove-media://photo.jpg')
  })

  it('accepts backups with version 1 that mobile would reject (exact version 2)', () => {
    const v1 = { ...MOBILE_V2_FIXTURE, version: 1 }
    const result = parseBackupJson(JSON.stringify(v1))
    assert.ok(result.saves.length >= 1)
  })
})

describe('backupZip', () => {
  it('round-trips a mobile-shaped zip: backup.json plus bundled media file', async () => {
    const zip = new JSZip()
    zip.file('backup.json', JSON.stringify(MOBILE_V2_FIXTURE, null, 2))
    zip.folder('media')?.file('photo.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })

    const parsed = await parseBackupZip(buffer)
    assert.equal(parsed.collections.length, 1)
    assert.deepEqual(parsed.saves.map(s => s.id).sort(), ['inbox-link', 'lib-note', 'photo'])
    const photo = parsed.saves.find(s => s.id === 'photo')
    assert.equal(photo?.image_url, 'trove-media://photo.jpg')
    assert.equal(parsed.media.length, 1)
    assert.equal(parsed.media[0]?.name, 'photo.jpg')
  })

  it('rejects a zip without backup.json', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'not a backup')
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })
    await assert.rejects(() => parseBackupZip(buffer), /backup.json/)
  })
})

describe('parseImportFile', () => {
  it('parses a .zip File the way the landing-page picker does', async () => {
    const zip = new JSZip()
    zip.file('backup.json', JSON.stringify(MOBILE_V2_FIXTURE))
    const bytes = await zip.generateAsync({ type: 'uint8array' })
    const file = new File([bytes.buffer as ArrayBuffer], 'trove-backup-fixture.zip', {
      type: 'application/zip',
    })
    const result = await parseImportFile(file)
    assert.equal(result.source, 'trove-zip')
    assert.equal(result.collections[0]?.name, 'Recipes')
    assert.equal(result.saves.some(s => s.id === 'inbox-link'), true)
    assert.equal(result.saves.some(s => s.id === 'vault-note'), false)
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
