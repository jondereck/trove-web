import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyReminderBucket, groupUpcomingReminders } from './reminderBuckets'

describe('reminderBuckets', () => {
  // Wednesday Sep 2, 2026 local noon
  const now = new Date(2026, 8, 2, 12, 0, 0)

  it('classifies today / tomorrow / this week / later', () => {
    assert.equal(classifyReminderBucket(new Date(2026, 8, 2, 21, 0, 0).toISOString(), now), 'today')
    assert.equal(classifyReminderBucket(new Date(2026, 8, 3, 9, 0, 0).toISOString(), now), 'tomorrow')
    assert.equal(classifyReminderBucket(new Date(2026, 8, 6, 16, 0, 0).toISOString(), now), 'thisWeek')
    assert.equal(classifyReminderBucket(new Date(2026, 8, 8, 10, 0, 0).toISOString(), now), 'later')
  })

  it('groups and omits empty buckets, sorted by fireAt', () => {
    const rows = [
      { id: 'b', fireAt: new Date(2026, 8, 3, 10, 0, 0).toISOString() },
      { id: 'a', fireAt: new Date(2026, 8, 2, 9, 0, 0).toISOString() },
      { id: 'c', fireAt: new Date(2026, 8, 10, 9, 0, 0).toISOString() },
    ]
    const buckets = groupUpcomingReminders(rows, now)
    assert.deepEqual(
      buckets.map(b => b.id),
      ['today', 'tomorrow', 'later'],
    )
    assert.equal(buckets[0].items[0].id, 'a')
    assert.equal(buckets[1].items[0].id, 'b')
    assert.equal(buckets[2].items[0].id, 'c')
  })
})
