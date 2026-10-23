import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { safeNextPath } from './safeNext'

describe('safeNextPath', () => {
  it('keeps the consent return path', () => {
    assert.equal(
      safeNextPath('/oauth/consent?authorization_id=abc'),
      '/oauth/consent?authorization_id=abc',
    )
  })

  it('keeps library and shared collection paths', () => {
    assert.equal(safeNextPath('/library'), '/library')
    assert.equal(safeNextPath('/c/abc'), '/c/abc')
  })

  it('rejects off-site and unknown paths', () => {
    assert.equal(safeNextPath('https://evil.example/oauth/consent'), null)
    assert.equal(safeNextPath('//evil.example'), null)
    assert.equal(safeNextPath('/settings'), null)
    assert.equal(safeNextPath(null), null)
  })
})
