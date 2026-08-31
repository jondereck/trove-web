import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { attachSaveCounts, filterSavesForCollection } from './collections'
import { searchLocalCollections, searchLocalSaves } from './search'
import { rankSavesByTerms } from './searchMatch'
import { tokenizeSearchQuery } from './searchQuery'
import type { Collection, Save } from './types'

const saves: Save[] = [
  {
    id: '1',
    user_id: 'u',
    title: 'React Native docs',
    description: 'Mobile guides',
    type: 'link',
    url: 'https://reactnative.dev',
    tags: ['docs', 'mobile'],
    is_inbox: false,
    created_at: '2026-08-28T09:00:00.000Z',
    collection_id: 'col-1',
  },
  {
    id: '2',
    user_id: 'u',
    title: 'Haircut ideas',
    description: 'Reference photos',
    type: 'note',
    tags: ['haircut', 'style'],
    is_inbox: false,
    created_at: '2026-08-27T09:00:00.000Z',
  },
  {
    id: '3',
    user_id: 'u',
    title: 'Inbox item',
    type: 'link',
    tags: [],
    is_inbox: true,
    created_at: '2026-08-26T09:00:00.000Z',
  },
]

const collections: Collection[] = [
  {
    id: 'col-1',
    user_id: 'u',
    name: 'Reading',
    description: 'Articles',
    created_at: '2026-08-01T10:00:00.000Z',
  },
]

describe('searchQuery', () => {
  it('tokenizes and drops stopwords', () => {
    assert.deepEqual(tokenizeSearchQuery('my react docs'), ['react', 'docs'])
  })
})

describe('searchMatch', () => {
  it('ranks title matches above url matches', () => {
    const ranked = rankSavesByTerms(saves, tokenizeSearchQuery('react'))
    assert.equal(ranked[0]?.id, '1')
  })

  it('matches partial tags', () => {
    const ranked = rankSavesByTerms(saves, tokenizeSearchQuery('hair'))
    assert.equal(ranked[0]?.id, '2')
  })
})

describe('search local', () => {
  it('filters inbox saves from search', () => {
    const results = searchLocalSaves(saves, 'inbox')
    assert.equal(results.length, 0)
  })

  it('finds collections by name', () => {
    const results = searchLocalCollections(collections, 'read')
    assert.equal(results[0]?.name, 'Reading')
  })
})

describe('collections helpers', () => {
  it('counts saves per collection', () => {
    const withCounts = attachSaveCounts(collections, saves)
    assert.equal(withCounts[0]?.save_count, 1)
  })

  it('filters collection saves', () => {
    const filtered = filterSavesForCollection(saves, 'col-1')
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0]?.id, '1')
  })
})
