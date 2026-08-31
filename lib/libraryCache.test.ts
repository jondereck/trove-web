import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  cachePageSnapshot,
  cacheSessionMetadata,
  clearLibraryCache,
  pageCacheKey,
  peekPageCache,
  peekLibrarySessionCache,
} from './libraryCache'
import type { Save } from './types'

const save = (id: string): Save => ({
  id,
  user_id: 'user-1',
  title: `Save ${id}`,
  type: 'link',
  tags: [],
  is_inbox: false,
  created_at: '2026-01-01T00:00:00.000Z',
})

describe('libraryCache', () => {
  afterEach(() => {
    clearLibraryCache()
  })

  it('builds stable page keys', () => {
    assert.equal(pageCacheKey('all'), 'library:all')
    assert.equal(pageCacheKey('note', 'abc'), 'collection:abc:note')
  })

  it('caches and peeks session metadata', () => {
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
    const session = peekLibrarySessionCache()
    assert.equal(session?.firstName, 'Jon')
    assert.equal(session?.collections[0]?.name, 'Work')
  })

  it('caches library page snapshots by filter', () => {
    cachePageSnapshot({
      saves: [save('1'), save('2')],
      total: 2,
      filter: 'all',
    })
    const page = peekPageCache('all')
    assert.equal(page?.saves.length, 2)
    assert.equal(page?.total, 2)
  })
})
