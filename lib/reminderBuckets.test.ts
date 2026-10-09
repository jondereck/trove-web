import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyReminderBucket, groupUpcomingReminders, omitRemindersDoneToday } from './reminderBuckets'

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

  it('hides a ticked reminder from Today but keeps a later day', () => {
    const today = new Date(2026, 8, 28, 23, 0, 0).toISOString()
    const tomorrow = new Date(2026, 8, 29, 10, 0, 0).toISOString()
    const rows = [
      { id: 'test', fireAt: today },
      { id: 'lunch', fireAt: tomorrow },
    ]
    const at = new Date(2026, 8, 28, 21, 35, 0)
    const visible = omitRemindersDoneToday(rows, new Set(['test']), at)
    assert.deepEqual(visible.map(row => row.id), ['lunch'])
  })

  it('keeps a weekly reminder after the ticked occurrence advances', () => {
    const doneFire = new Date(2026, 9, 5, 9, 0, 0).toISOString()
    const nextFire = new Date(2026, 9, 6, 9, 0, 0).toISOString()
    const at = new Date(2026, 9, 5, 7, 30, 0)
    const visible = omitRemindersDoneToday(
      [{ id: 'lunch', fireAt: nextFire }],
      [{ id: 'lunch', fireAt: doneFire }],
      at,
    )
    assert.deepEqual(visible.map(row => row.id), ['lunch'])
  })

  it('hides Today even when done fireAt string differs from displayed occurrence', () => {
    const displayed = new Date(2026, 9, 9, 9, 0, 0).toISOString()
    const archived = '2026-10-09T07:28:03.566Z'
    const nextWeek = new Date(2026, 9, 16, 9, 0, 0).toISOString()
    const at = new Date(2026, 9, 9, 15, 0, 0)
    const visible = omitRemindersDoneToday(
      [
        { id: 'cactus', fireAt: displayed },
        { id: 'cactus-next', fireAt: nextWeek },
      ],
      [{ id: 'cactus', fireAt: archived }],
      at,
    )
    assert.deepEqual(visible.map(row => row.id), ['cactus-next'])
  })
})
