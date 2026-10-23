import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateMcpToken, hashMcpToken, isMcpToken } from './tokens'

describe('mcp tokens', () => {
  it('creates a trove_sk token and a stable hash', () => {
    const created = generateMcpToken()
    assert.equal(created.token.startsWith('trove_sk_'), true)
    assert.equal(created.tokenHash, hashMcpToken(created.token))
    assert.equal(created.tokenPrefix, created.token.slice(0, 'trove_sk_'.length + 8))
    assert.equal(isMcpToken(created.token), true)
  })

  it('rejects tokens that are not personal Trove keys', () => {
    assert.equal(isMcpToken(''), false)
    assert.equal(isMcpToken('sk_live_abc'), false)
    assert.equal(isMcpToken('trove_sk_short'), false)
  })
})
