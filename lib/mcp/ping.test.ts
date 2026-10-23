import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pingText } from './ping'

describe('ping', () => {
  it('returns pong when no message is given', () => {
    assert.equal(pingText(), 'pong')
  })

  it('echoes a trimmed message', () => {
    assert.equal(pingText({ message: '  hello  ' }), 'pong: hello')
  })

  it('treats a blank message as a bare pong', () => {
    assert.equal(pingText({ message: '   ' }), 'pong')
  })
})
