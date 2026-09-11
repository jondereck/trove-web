import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isMobileAllowedPath } from './mobileViewportAllow'

describe('isMobileAllowedPath', () => {
  it('allows shared collection paths', () => {
    assert.equal(isMobileAllowedPath('/c/task3testtoken0000000001'), true)
    assert.equal(isMobileAllowedPath('/c/accept'), true)
    assert.equal(isMobileAllowedPath('/c/accept?invite=abc'), true)
    assert.equal(isMobileAllowedPath('/c'), true)
  })

  it('blocks the rest of the app', () => {
    assert.equal(isMobileAllowedPath('/'), false)
    assert.equal(isMobileAllowedPath('/library'), false)
    assert.equal(isMobileAllowedPath('/collections'), false)
    assert.equal(isMobileAllowedPath('/collections/abc'), false)
  })
})
