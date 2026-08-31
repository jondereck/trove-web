import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { oauthCallbackUrl } from './oauth'

describe('oauth', () => {
  it('builds callback path from origin', () => {
    assert.equal(oauthCallbackUrl('http://localhost:3001'), 'http://localhost:3001/auth/callback')
  })
})
