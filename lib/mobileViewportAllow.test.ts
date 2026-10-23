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

  it('allows OAuth consent and the sign-in page that returns there', () => {
    assert.equal(isMobileAllowedPath('/oauth/consent'), true)
    assert.equal(isMobileAllowedPath('/oauth/consent?authorization_id=abc'), true)
    assert.equal(isMobileAllowedPath('/auth/callback'), true)
    assert.equal(isMobileAllowedPath('/', 'next=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc'), true)
  })

  it('blocks the rest of the app', () => {
    assert.equal(isMobileAllowedPath('/'), false)
    assert.equal(isMobileAllowedPath('/library'), false)
    assert.equal(isMobileAllowedPath('/collections'), false)
    assert.equal(isMobileAllowedPath('/collections/abc'), false)
  })
})
