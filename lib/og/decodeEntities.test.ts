import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decodeOgText } from './decodeEntities'

describe('decodeOgText', () => {
  it('decodes named and numeric entities', () => {
    assert.equal(decodeOgText('a &amp; b'), 'a & b')
    assert.equal(decodeOgText('4.1K views &#xb7; 3.5K reactions'), '4.1K views · 3.5K reactions')
  })

  it('decodes image urls for FB hash requests', () => {
    const raw = 'https://lookaside.fbsbx.com/x?x=1&amp;y=2'
    assert.equal(decodeOgText(raw), 'https://lookaside.fbsbx.com/x?x=1&y=2')
  })
})