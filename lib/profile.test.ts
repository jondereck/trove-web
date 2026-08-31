import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { profileDisplayName, profileInitials } from './profile'

describe('profile helpers', () => {
  it('builds display name and initials from first and last name', () => {
    assert.equal(profileDisplayName('Jon', 'Doe'), 'Jon Doe')
    assert.equal(profileInitials('Jon', 'Doe'), 'JD')
  })

  it('falls back to Guest when names are missing', () => {
    assert.equal(profileDisplayName(), 'Guest')
    assert.equal(profileInitials(), 'G')
  })
})
