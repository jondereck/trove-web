import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getSaveImageUrls, syncCoverFromGallery } from './saveImages'

describe('getSaveImageUrls', () => {
  it('uses image_urls when present', () => {
    assert.deepEqual(
      getSaveImageUrls({ image_url: 'a', image_urls: ['b', 'c'] }),
      ['b', 'c'],
    )
  })

  it('treats an explicit empty gallery as authoritative', () => {
    assert.deepEqual(
      getSaveImageUrls({ image_url: 'stale.jpg', image_urls: [] }),
      [],
    )
  })

  it('falls back to image_url', () => {
    assert.deepEqual(getSaveImageUrls({ image_url: 'a' }), ['a'])
  })

  it('returns empty when neither', () => {
    assert.deepEqual(getSaveImageUrls({}), [])
  })
})

describe('syncCoverFromGallery', () => {
  it('sets cover to first url', () => {
    assert.deepEqual(syncCoverFromGallery(['x', 'y']), {
      image_url: 'x',
      image_urls: ['x', 'y'],
    })
  })

  it('clears the persisted cover with null when the gallery is empty', () => {
    assert.deepEqual(syncCoverFromGallery([]), {
      image_url: null,
      image_urls: [],
    })
  })
})
