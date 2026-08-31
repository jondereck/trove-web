import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultLinkTitle } from './quickSave'

describe('quickSave', () => {
  it('derives link title from hostname', () => {
    assert.equal(defaultLinkTitle('https://www.github.com/foo'), 'github.com')
  })

  it('falls back to raw url when invalid', () => {
    assert.equal(defaultLinkTitle('not-a-url'), 'not-a-url')
  })

  it('uses untitled for empty url', () => {
    assert.equal(defaultLinkTitle('   '), 'Untitled link')
  })
})
