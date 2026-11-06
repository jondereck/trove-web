import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseImportFile } from '../import'
import { parseBackupJson } from '../import/backupJson'
import { backupZipFile, createBackupZipBytes } from './createBackupZip'
import { backupZipFilename, mapRecordsForExport } from './payload'
import { MEDIA_SCHEME } from './media'
import type { Collection, Save } from '../types'

const exportedAt = '2026-11-06T12:00:00.000Z'

function save(partial: Partial<Save> & Pick<Save, 'id' | 'title'>): Save {
  return {
    user_id: 'guest',
    type: 'note',
    tags: [],
    is_inbox: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const collections: Collection[] = [{
  id: 'col-1',
  user_id: 'guest',
  name: 'Recipes',
  created_at: '2026-01-01T00:00:00.000Z',
}]

const fixtureSaves: Save[] = [
  save({ id: 'lib-note', title: 'Soup', collection_id: 'col-1' }),
  save({
    id: 'inbox-link',
    title: 'Unsorted article',
    type: 'link',
    url: 'https://example.com/post',
    is_inbox: true,
  }),
  save({
    id: 'photo',
    title: 'Kitchen',
    type: 'image',
    image_url: `${MEDIA_SCHEME}photo.jpg`,
  }),
  save({
    id: 'vault-note',
    title: 'Secret',
    is_vault: true,
  }),
]

describe('backup export filename', () => {
  it('matches mobile trove-backup-{timestamp}.zip', () => {
    assert.equal(backupZipFilename(1700000000000), 'trove-backup-1700000000000.zip')
  })
})

describe('backup round-trip', () => {
  it('exports v2 zip then parseImportFile keeps inbox, media refs, and drops vault', async () => {
    const photoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const { payload, media } = await mapRecordsForExport(
      fixtureSaves,
      collections,
      async uri => {
        if (uri === `${MEDIA_SCHEME}photo.jpg`) {
          return { name: 'photo.jpg', bytes: photoBytes, mime: 'image/jpeg' }
        }
        return null
      },
      exportedAt,
    )

    assert.equal(payload.version, 2)
    assert.equal(payload.exportedAt, exportedAt)
    assert.equal(payload.saves.length, 3)
    assert.equal(payload.saves.some(row => row.is_inbox), true)
    assert.equal(payload.saves.some(row => row.is_vault), false)
    assert.equal(media.length, 1)
    assert.equal(media[0]?.name, 'photo.jpg')

    const bytes = await createBackupZipBytes(payload, media)
    const file = backupZipFile(bytes, backupZipFilename(1700000000000))
    const parsed = await parseImportFile(file)

    assert.equal(parsed.source, 'trove-zip')
    assert.equal(parsed.collections.length, 1)
    assert.equal(parsed.saves.length, 3)
    assert.deepEqual(parsed.saves.map(row => row.id).sort(), ['inbox-link', 'lib-note', 'photo'])
    assert.equal(parsed.saves.find(row => row.id === 'inbox-link')?.is_inbox, true)
    assert.equal(parsed.saves.find(row => row.id === 'photo')?.image_url, `${MEDIA_SCHEME}photo.jpg`)
    assert.equal(parsed.media?.length, 1)
    assert.equal(parsed.media?.[0]?.name, 'photo.jpg')
  })

  it('round-trips JSON with the same save and collection counts', async () => {
    const { payload } = await mapRecordsForExport(fixtureSaves, collections, undefined, exportedAt)
    const json = JSON.stringify(payload)
    const fromJson = parseBackupJson(json)
    const file = new File([json], 'trove-backup.json', { type: 'application/json' })
    const parsed = await parseImportFile(file)
    assert.equal(fromJson.saves.length, parsed.saves.length)
    assert.equal(fromJson.collections.length, parsed.collections.length)
    assert.equal(parsed.saves.length, 3)
    assert.equal(parsed.collections.length, 1)
  })

  it('leaves https media as URLs', async () => {
    const { payload, media } = await mapRecordsForExport(
      [save({
        id: 'remote',
        title: 'Remote photo',
        type: 'image',
        image_url: 'https://cdn.example.com/pic.jpg',
      })],
      [],
    )
    assert.equal(payload.saves[0]?.image_url, 'https://cdn.example.com/pic.jpg')
    assert.equal(media.length, 0)
  })
})
