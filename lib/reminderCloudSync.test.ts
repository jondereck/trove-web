import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeUpcomingReminders } from './reminderCloudSync'
import type { StoredSaveReminder } from './saveRemindersCore'

function row(
  partial: Pick<StoredSaveReminder, 'id' | 'saveId' | 'fireAt'> & Partial<StoredSaveReminder>,
): StoredSaveReminder {
  return {
    id: partial.id,
    saveId: partial.saveId,
    title: partial.title ?? 'Reminder',
    sourceText: partial.sourceText ?? null,
    eventAt: partial.eventAt ?? partial.fireAt,
    eventEndAt: partial.eventEndAt ?? null,
    fireAt: partial.fireAt,
    leadMinutes: partial.leadMinutes ?? 0,
    firedAt: partial.firedAt ?? null,
    calendarId: partial.calendarId ?? null,
    calendarEventId: partial.calendarEventId ?? null,
    repeat: partial.repeat ?? null,
    updatedAt: partial.updatedAt,
    deletedAt: partial.deletedAt,
    localOnly: partial.localOnly,
  }
}

describe('mergeUpcomingReminders', () => {
  it('prefers phone-advanced fireAt over stale local today even if local stamp is newer', () => {
    const now = new Date(2026, 9, 19, 22, 0, 0).getTime()
    const local = {
      lunch: row({
        id: 'lunch',
        saveId: 's',
        fireAt: new Date(2026, 9, 19, 8, 0, 0).toISOString(),
        updatedAt: '2026-10-19T14:00:00.000Z',
        repeat: { frequency: 'weekly', interval: 1, weekdays: [2] },
      }),
    }
    const remote = {
      lunch: row({
        id: 'lunch',
        saveId: 's',
        fireAt: new Date(2026, 9, 20, 8, 0, 0).toISOString(),
        updatedAt: '2026-10-19T10:00:00.000Z',
        repeat: { frequency: 'weekly', interval: 1, weekdays: [2] },
      }),
    }
    const merged = mergeUpcomingReminders(local, remote, now)
    assert.equal(merged.lunch.fireAt, remote.lunch.fireAt)
  })

  it('still honors a newer cloud deletion', () => {
    const local = {
      gone: row({
        id: 'gone',
        saveId: 's',
        fireAt: '2026-08-21T00:00:00.000Z',
        updatedAt: '2026-08-19T08:00:00.000Z',
      }),
    }
    const remote = {
      gone: row({
        id: 'gone',
        saveId: 's',
        fireAt: '2026-08-21T00:00:00.000Z',
        updatedAt: '2026-08-19T09:00:00.000Z',
        deletedAt: '2026-08-19T09:00:00.000Z',
      }),
    }
    const merged = mergeUpcomingReminders(local, remote)
    assert.equal(merged.gone, undefined)
  })
})
