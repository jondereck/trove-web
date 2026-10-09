import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  remindersDueToday,
  remindersForNotificationsList,
  remindersForTodayList,
  remindersOnCalendarDay,
} from './dailyTasksReminders'
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
    repeat: partial.repeat ?? null,
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

describe('remindersForTodayList', () => {
  const day = new Date(2026, 9, 8, 12, 0)

  it('keeps upcoming today and history that fired today', () => {
    const list = remindersForTodayList(
      [
        row({ id: 'open', fireAt: new Date(2026, 9, 8, 15, 0).toISOString() }),
        row({ id: 'later', fireAt: new Date(2026, 9, 9, 9, 0).toISOString() }),
      ],
      [
        row({
          id: 'fired',
          fireAt: new Date(2026, 9, 8, 8, 0).toISOString(),
          firedAt: new Date(2026, 9, 8, 8, 0).toISOString(),
        }),
      ],
      day,
    )
    assert.deepEqual(list.map(r => r.id).sort(), ['fired', 'open'])
  })

  it('keeps weekly Water Plants after cloud advanced fireAt to next week (no local history)', () => {
    // Mobile fired today 9am → history local + upcoming next Friday.
    // Cloud only has the advanced upcoming row (firedAt null) — web must still list today.
    const nextWeek = new Date(2026, 9, 15, 9, 0)
    const list = remindersForTodayList(
      [
        row({
          id: 'water',
          title: 'Water Plants',
          fireAt: nextWeek.toISOString(),
          eventAt: nextWeek.toISOString(),
          repeat: { frequency: 'weekly', interval: 1, weekdays: [4] }, // Thu=4? Oct 8 2026 is Thursday
        }),
      ],
      [],
      day,
    )
    assert.equal(list.some(r => r.id === 'water'), true)
  })

  it('puts advanced weekly Water Plants under Notifications Today until Daily tick', () => {
    const todayFire = new Date(2026, 9, 8, 9, 0)
    const nextWeek = new Date(2026, 9, 15, 9, 0)
    const list = remindersForNotificationsList(
      [
        row({
          id: 'water',
          title: 'Water Plants',
          fireAt: nextWeek.toISOString(),
          eventAt: nextWeek.toISOString(),
          repeat: { frequency: 'weekly', interval: 1, weekdays: [4] },
        }),
      ],
      [
        row({
          id: 'water',
          title: 'Water Plants',
          fireAt: todayFire.toISOString(),
          eventAt: todayFire.toISOString(),
          firedAt: todayFire.toISOString(),
          repeat: { frequency: 'weekly', interval: 1, weekdays: [4] },
        }),
      ],
      day,
    )
    const water = list.find(r => r.id === 'water')
    assert.ok(water)
    assert.equal(water!.fireAt, todayFire.toISOString())
    assert.equal(water!.firedAt, null)
  })
})
