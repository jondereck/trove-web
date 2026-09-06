import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { cacheSessionMetadata, clearLibraryCache } from './libraryCache'
import { createInitialCloudLibraryState } from './initialLibraryState'

describe('createInitialCloudLibraryState', () => {
  afterEach(() => {
    clearLibraryCache()
  })

  it('ignores session cache so SSR and first client paint match', () => {
    cacheSessionMetadata({
      collections: [{
        id: 'c1',
        user_id: 'user-1',
        name: 'Work',
        save_count: 2,
        cover_slots: [],
        created_at: '2026-01-01T00:00:00.000Z',
      }],
      firstName: 'Jon',
    })

    const initial = createInitialCloudLibraryState()

    assert.equal(initial.firstName, undefined)
    assert.deepEqual(initial.collections, [])
    assert.equal(initial.loading, true)
    assert.equal(initial.mode, 'cloud')
  })
})
