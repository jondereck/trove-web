import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { advanceCaughtUpRepeatingRows } from './saveRemindersCore'
import type { StoredSaveReminder } from './saveRemindersCore'

function row(
  partial: Pick<StoredSaveReminder, 'id' | 'fireAt'> & Partial<StoredSaveReminder>,
): StoredSaveReminder {
  return {
    id: partial.id,
    saveId: partial.saveId ?? 's',
    title: partial.title ?? partial.id,
    eventAt: partial.eventAt ?? partial.fireAt,
    fireAt: partial.fireAt,
    leadMinutes: partial.leadMinutes ?? 0,
    repeat: partial.repeat ?? null,
    firedAt: partial.firedAt ?? null,
    deletedAt: partial.deletedAt ?? null,
    updatedAt: partial.updatedAt ?? null,
  }
}

describe('advanceCaughtUpRepeatingRows', () => {
  // Monday Oct 19, 2026 evening
  const now = new Date(2026, 9, 19, 22, 0, 0).getTime()

  it('advances overdue Sunday weekly off Monday (not in done)', () => {
    const { rows, changed } = advanceCaughtUpRepeatingRows(
      [
        row({
          id: 'media',
          title: 'Multimedia Systems',
          fireAt: new Date(2026, 9, 18, 8, 0, 0).toISOString(),
          eventAt: new Date(2026, 9, 18, 8, 0, 0).toISOString(),
          repeat: { frequency: 'weekly', interval: 1, weekdays: [0] },
        }),
      ],
      new Set(),
      now,
    )
    assert.equal(changed.length, 1)
    assert.ok(Date.parse(rows[0].fireAt) >= new Date(2026, 9, 20).getTime())
    assert.equal(new Date(rows[0].fireAt).getDay(), 0)
  })

  it('keeps same-day open daily overdue until done', () => {
    const fire = new Date(2026, 9, 19, 7, 20, 0).toISOString()
    const { rows, changed } = advanceCaughtUpRepeatingRows(
      [
        row({
          id: 'claim',
          fireAt: fire,
          eventAt: fire,
          repeat: { frequency: 'daily', interval: 1 },
        }),
      ],
      new Set(),
      now,
    )
    assert.equal(changed.length, 0)
    assert.equal(rows[0].fireAt, fire)
  })

  it('advances done daily to tomorrow', () => {
    const fire = new Date(2026, 9, 19, 7, 20, 0).toISOString()
    const { rows, changed } = advanceCaughtUpRepeatingRows(
      [
        row({
          id: 'claim',
          fireAt: fire,
          eventAt: fire,
          repeat: { frequency: 'daily', interval: 1 },
        }),
      ],
      new Set(['claim']),
      now,
    )
    assert.equal(changed.length, 1)
    assert.ok(Date.parse(rows[0].fireAt) >= new Date(2026, 9, 20).getTime())
  })
})
