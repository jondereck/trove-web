import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  restoreReminderOccurrenceInStore,
  type SaveReminderStore,
} from './saveRemindersCore'

function storeWith(partial: Partial<SaveReminderStore>): SaveReminderStore {
  return {
    upcoming: {},
    history: [],
    historyClearedAt: null,
    ...partial,
  }
}

describe('restoreReminderOccurrenceInStore', () => {
  it('keeps a same-day one-shot in history so Today can show it again', () => {
    const fireAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const restored = restoreReminderOccurrenceInStore(storeWith({ upcoming: {}, history: [] }), {
      reminderId: 'rem-1',
      saveId: 'save-1',
      title: 'Call dentist',
      eventAt: fireAt,
      fireAt,
      repeat: null,
    })
    assert.ok(restored.history.some(row => row.id === 'rem-1' && row.title === 'Call dentist'))
  })

  it('keeps a repeating series on the later fire after uncheck', () => {
    const today = new Date()
    today.setHours(9, 0, 0, 0)
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const restored = restoreReminderOccurrenceInStore(storeWith({
      upcoming: {
        water: {
          id: 'water',
          saveId: 'save-1',
          title: 'Water plants',
          eventAt: nextWeek.toISOString(),
          fireAt: nextWeek.toISOString(),
          leadMinutes: 0,
          repeat: { frequency: 'weekly', interval: 1, weekdays: [today.getDay()] },
          updatedAt: nextWeek.toISOString(),
        },
      },
      history: [],
    }), {
      reminderId: 'water',
      saveId: 'save-1',
      title: 'Water plants',
      eventAt: today.toISOString(),
      fireAt: today.toISOString(),
      repeat: { frequency: 'weekly', interval: 1, weekdays: [today.getDay()] },
    })
    assert.ok(Date.parse(restored.upcoming.water!.fireAt) > today.getTime())
    assert.equal(restored.upcoming.water?.repeat?.frequency, 'weekly')
    assert.ok(restored.history.some(row => row.id === 'water'))
  })
})
