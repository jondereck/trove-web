import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { oauthCallbackUrl, SIGN_OUT_SCOPE } from './oauth'

describe('oauth', () => {
  it('builds callback path from origin', () => {
    assert.equal(oauthCallbackUrl('http://localhost:3001'), 'http://localhost:3001/auth/callback')
  })

  it('signs out only the current session by default', () => {
    assert.equal(SIGN_OUT_SCOPE, 'local')
  })
})
