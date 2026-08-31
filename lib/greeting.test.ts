import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { greetingForHour } from './greeting'

describe('greeting', () => {
  it('uses morning before noon', () => {
    assert.equal(greetingForHour(9, 'Jon'), 'Good morning, Jon')
  })

  it('uses afternoon mid-day', () => {
    assert.equal(greetingForHour(14), 'Good afternoon')
  })
})
