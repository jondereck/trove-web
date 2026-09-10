import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sharedCollectionPath, isSharedCollectionToken } from './sharedCollection'

describe('sharedCollectionPath', () => {
  it('builds path', () => {
    assert.equal(sharedCollectionPath('abc'), '/c/abc')
  })
})

describe('isSharedCollectionToken', () => {
  it('rejects short or unsafe tokens', () => {
    assert.equal(isSharedCollectionToken('x'), false)
    assert.equal(isSharedCollectionToken('a'.repeat(22)), true)
  })
})
