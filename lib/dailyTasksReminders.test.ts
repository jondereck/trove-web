import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { remindersDueToday, remindersOnCalendarDay } from './dailyTasksReminders'
import type { StoredSaveReminder } from './saveRemindersCore'

function row(partial: Partial<StoredSaveReminder> & { id: string; fireAt: string }): StoredSaveReminder {
  return {
    id: partial.id,
    saveId: partial.saveId ?? 'save-1',
    title: partial.title ?? 'Note',
    eventAt: partial.eventAt ?? partial.fireAt,
    fireAt: partial.fireAt,
    leadMinutes: partial.leadMinutes ?? 0,
    updatedAt: partial.updatedAt ?? '2026-10-08T00:00:00.000Z',
    firedAt: partial.firedAt ?? null,
    deletedAt: partial.deletedAt ?? null,
  }
}

describe('remindersDueToday', () => {
  const now = new Date(2026, 9, 8, 12, 0)

  it('keeps today and overdue, drops tomorrow', () => {
    const list = remindersDueToday(
      [
        row({ id: 'a', fireAt: new Date(2026, 9, 8, 9, 0).toISOString() }),
        row({ id: 'b', fireAt: new Date(2026, 9, 7, 9, 0).toISOString() }),
        row({ id: 'c', fireAt: new Date(2026, 9, 9, 9, 0).toISOString() }),
        row({ id: 'd', fireAt: new Date(2026, 9, 8, 15, 0).toISOString(), firedAt: 'x' }),
      ],
      now,
    )
    assert.deepEqual(list.map(r => r.id), ['b', 'a'])
  })

  it('filters agenda day by fire calendar date', () => {
    const day = new Date(2026, 9, 8)
    const list = remindersOnCalendarDay(
      [
        row({ id: 'a', fireAt: new Date(2026, 9, 8, 9, 0).toISOString() }),
        row({ id: 'b', fireAt: new Date(2026, 9, 9, 9, 0).toISOString() }),
      ],
      day,
    )
    assert.deepEqual(list.map(r => r.id), ['a'])
  })
})
