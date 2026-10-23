import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { acceptPayload, isSupabaseAccessJwt, readScopes } from './supabaseAccessToken'

const issuer = 'https://example.supabase.co/auth/v1'

describe('supabase access token claims', () => {
  it('recognizes a three-part access token', () => {
    assert.equal(isSupabaseAccessJwt('eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxIn0.sig'), true)
    assert.equal(isSupabaseAccessJwt('trove_sk_abc'), false)
  })

  it('adds read scope when the token does not name one', () => {
    assert.deepEqual(readScopes({}), ['trove:read'])
    assert.deepEqual(readScopes({ scope: 'openid email' }), ['openid', 'email', 'trove:read'])
  })

  it('accepts a live token for this project only', () => {
    const future = Math.floor(Date.now() / 1000) + 60
    assert.equal(
      acceptPayload(
        { sub: '750fa7c7-c1f8-4339-8239-d7fc841b2745', iss: issuer, exp: future },
        issuer,
      ),
      '750fa7c7-c1f8-4339-8239-d7fc841b2745',
    )
    assert.equal(
      acceptPayload(
        { sub: '750fa7c7-c1f8-4339-8239-d7fc841b2745', iss: 'https://other.supabase.co/auth/v1', exp: future },
        issuer,
      ),
      null,
    )
    assert.equal(
      acceptPayload(
        { sub: '750fa7c7-c1f8-4339-8239-d7fc841b2745', iss: issuer, exp: 1 },
        issuer,
      ),
      null,
    )
  })
})
