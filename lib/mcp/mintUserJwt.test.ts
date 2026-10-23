import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { describe, it } from 'node:test'
import { mintUserJwt } from './mintUserJwt'

const SECRET = 'test-jwt-secret'
const USER_ID = '11111111-1111-1111-1111-111111111111'

function payloadOf(token: string): Record<string, unknown> {
  const [header, body, sig] = token.split('.')
  const expected = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url')
  assert.equal(sig, expected)
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, unknown>
}

describe('mintUserJwt', () => {
  it('signs an authenticated user token that expires in about five minutes', () => {
    const now = 1_700_000_000
    const token = mintUserJwt({
      userId: USER_ID,
      secret: SECRET,
      now,
    })
    const claims = payloadOf(token)
    assert.equal(claims.sub, USER_ID)
    assert.equal(claims.role, 'authenticated')
    assert.equal(claims.aud, 'authenticated')
    assert.equal(claims.iat, now)
    assert.equal(claims.exp, now + 300)
  })
})
