import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Save, TrackerData } from './types'
import {
  addTimeInterval,
  catchupAutoLogRecords,
  computeNextDue,
  computeStatus,
  createQuickRecord,
  currentRecord,
  formatCadenceLabel,
  formatCombineNote,
  formatCountdownAmount,
  formatDurationBreakdown,
  formatElapsedDuration,
  formatMetricValue,
  formatNextLabel,
  formatNumber,
  formatRecordLabel,
  formatRelativeDue,
  getCurrencySymbol,
  isCurrencyUnit,
  previousRecord,
  readTracker,
  removeRecord,
  serializeTrackerContent,
  sortRecords,
  trackerHasDateDue,
  upsertRecord,
} from './tracker'

const now = new Date(2026, 7, 22, 9, 0, 0) // Aug 22, 2026

function tracker(partial: Partial<TrackerData>): TrackerData {
  return { records: [], ...partial }
}

describe('tracker records', () => {
  it('sorts records newest-first and exposes current/previous', () => {
    const data = tracker({
      records: [
        { id: 'a', at: '2026-01-23T00:00:00.000Z', metricValue: 47041 },
        { id: 'b', at: '2026-08-22T00:00:00.000Z', metricValue: 51113 },
      ],
    })
    assert.equal(currentRecord(data)?.id, 'b')
    assert.equal(previousRecord(data)?.id, 'a')
    assert.deepEqual(sortRecords(data.records).map(r => r.id), ['b', 'a'])
  })

  it('upserts and removes records keeping order', () => {
    let data = tracker({ records: [{ id: 'a', at: '2026-01-01T00:00:00.000Z' }] })
    data = upsertRecord(data, { id: 'b', at: '2026-02-01T00:00:00.000Z' })
    assert.equal(currentRecord(data)?.id, 'b')
    data = upsertRecord(data, { id: 'b', at: '2026-03-01T00:00:00.000Z', label: 'edited' })
    assert.equal(data.records.length, 2)
    assert.equal(currentRecord(data)?.label, 'edited')
    data = removeRecord(data, 'b')
    assert.equal(currentRecord(data)?.id, 'a')
  })

  it('keeps the optional calendar view setting when serialized', () => {
    const data = tracker({ calendarView: true })
    const save = { type: 'tracker', content: serializeTrackerContent(data) } as Pick<Save, 'type' | 'content' | 'tracker'>
    assert.equal(readTracker(save)?.calendarView, true)
  })
})

describe('addTimeInterval month-end clamp', () => {
  it('clamps a 31st into a 30-day month', () => {
    const jan31 = new Date(2026, 0, 31)
    assert.equal(addTimeInterval(jan31, 1, 'month').getMonth(), 1) // Feb
    assert.equal(addTimeInterval(jan31, 1, 'month').getDate(), 28) // 2026 not leap
  })
  it('adds weeks and years', () => {
    assert.equal(addTimeInterval(new Date(2026, 0, 1), 2, 'week').getDate(), 15)
    assert.equal(addTimeInterval(new Date(2026, 0, 1), 1, 'year').getFullYear(), 2027)
  })
  it('clamps Feb 29 on year add to a non-leap year', () => {
    const feb29 = new Date(2024, 1, 29)
    const next = addTimeInterval(feb29, 1, 'year')
    assert.equal(next.getMonth(), 1)
    assert.equal(next.getDate(), 28)
  })
})

describe('computeNextDue', () => {
  const records = [{ id: 'b', at: '2026-08-22T00:00:00.000Z', metricValue: 51113 }]

  it('returns null with no rule', () => {
    assert.equal(computeNextDue(tracker({ records }), now), null)
  })

  it('interval time + metric produces both dues', () => {
    const data = tracker({
      metric: { label: 'Mileage', unit: 'km' },
      rule: { kind: 'interval', time: { every: 6, unit: 'month' }, metric: { every: 5000 }, combine: 'first' },
      records,
    })
    const next = computeNextDue(data, now)
    assert.ok(next)
    assert.equal(next!.dueMetric, 56113)
    assert.equal(new Date(next!.dueAt!).getMonth(), 1) // Feb 2027
    assert.equal(new Date(next!.dueAt!).getFullYear(), 2027)
  })

  it('metric-only interval has no dueAt (no date notification)', () => {
    const data = tracker({
      metric: { label: 'Uses', unit: 'uses' },
      rule: { kind: 'interval', metric: { every: 10 }, combine: 'first' },
      records: [{ id: 'x', at: '2026-08-22T00:00:00.000Z', metricValue: 3 }],
    })
    const next = computeNextDue(data, now)
    assert.equal(next?.dueAt, undefined)
    assert.equal(next?.dueMetric, 13)
    assert.equal(trackerHasDateDue(data, now), false)
  })

  it('deadline returns the fixed dueAt', () => {
    const data = tracker({ rule: { kind: 'deadline', dueAt: '2028-01-23T00:00:00.000Z' }, records: [] })
    assert.equal(computeNextDue(data, now)?.dueAt, '2028-01-23T00:00:00.000Z')
    assert.equal(trackerHasDateDue(data, now), true)
  })

  it('interval with no records yields null', () => {
    const data = tracker({ rule: { kind: 'interval', time: { every: 1, unit: 'month' } }, records: [] })
    assert.equal(computeNextDue(data, now), null)
  })
})

describe('computeStatus', () => {
  it('interval overdue / due_soon / on_track by date', () => {
    const base = { metric: { label: 'M', unit: 'km' }, rule: { kind: 'interval' as const, time: { every: 6, unit: 'month' as const } } }
    const overdue = tracker({ ...base, records: [{ id: '1', at: '2026-01-01T00:00:00.000Z' }] })
    assert.equal(computeStatus(overdue, now), 'overdue')
    const soon = tracker({ ...base, rule: { kind: 'interval', time: { every: 5, unit: 'day' } }, records: [{ id: '2', at: '2026-08-20T00:00:00.000Z' }] })
    assert.equal(computeStatus(soon, now), 'due_soon')
    const ok = tracker({ ...base, records: [{ id: '3', at: '2026-08-01T00:00:00.000Z' }] })
    assert.equal(computeStatus(ok, now), 'on_track')
  })

  it('deadline active / due_soon / expired', () => {
    const active = tracker({ rule: { kind: 'deadline', dueAt: '2028-01-23T00:00:00.000Z' }, records: [] })
    assert.equal(computeStatus(active, now), 'active')
    const soon = tracker({ rule: { kind: 'deadline', dueAt: '2026-08-25T00:00:00.000Z', leadDays: 7 }, records: [] })
    assert.equal(computeStatus(soon, now), 'due_soon')
    const expired = tracker({ rule: { kind: 'deadline', dueAt: '2026-01-01T00:00:00.000Z' }, records: [] })
    assert.equal(computeStatus(expired, now), 'expired')
  })

  it('metric-only interval stays on_track (no sensor)', () => {
    const data = tracker({
      metric: { label: 'Uses', unit: 'uses' },
      rule: { kind: 'interval', metric: { every: 10 } },
      records: [{ id: 'x', at: '2026-08-22T00:00:00.000Z', metricValue: 3 }],
    })
    assert.equal(computeStatus(data, now), 'on_track')
  })

  it('no rule → null', () => {
    assert.equal(computeStatus(tracker({ records: [{ id: '1', at: '2026-08-22T00:00:00.000Z' }] }), now), null)
  })
})

describe('formatting', () => {
  it('groups numbers with commas', () => {
    assert.equal(formatNumber(51113), '51,113')
    assert.equal(formatNumber(2970.5), '2,970.5')
    assert.equal(formatNumber(-1000), '-1,000')
  })

  it('relative due copy', () => {
    assert.equal(formatRelativeDue(-3 * 86400000), 'overdue by 3 days')
    assert.equal(formatRelativeDue(0), 'due today')
    assert.equal(formatRelativeDue(12 * 86400000), 'in 12 days')
    assert.equal(formatRelativeDue(180 * 86400000), 'in ~6 months')
  })

  it('duration breakdown for deadlines', () => {
    assert.equal(formatDurationBreakdown(-1), '')
    assert.equal(formatDurationBreakdown(10 * 86400000), '10 days left')
    assert.equal(formatDurationBreakdown(90 * 86400000), '3 months left')
    assert.equal(formatDurationBreakdown(520 * 86400000), '1y 5m left')
  })

  it('elapsed duration uses days then months then years', () => {
    assert.equal(formatElapsedDuration(1 * 86400000), '1 day')
    assert.equal(formatElapsedDuration(12 * 86400000), '12 days')
    assert.equal(formatElapsedDuration(211 * 86400000), '7 months')
    assert.equal(formatElapsedDuration(400 * 86400000), '1y 1m')
  })

  it('cadence label with metric + time', () => {
    const label = formatCadenceLabel(
      { kind: 'interval', time: { every: 6, unit: 'month' }, metric: { every: 5000 } },
      { label: 'Mileage', unit: 'km' },
    )
    assert.equal(label, 'Every 6 months / 5,000 km')
  })

  it('countdown amount for overview hero', () => {
    assert.equal(formatCountdownAmount(180 * 86400000), '180 days')
    assert.equal(formatCountdownAmount(0), 'today')
    assert.equal(formatCountdownAmount(-3 * 86400000), '3 days overdue')
  })

  it('combine note when both interval parts exist', () => {
    assert.equal(
      formatCombineNote({ kind: 'interval', time: { every: 6, unit: 'month' }, metric: { every: 5000 } }),
      'whichever comes first',
    )
    assert.equal(
      formatCombineNote({ kind: 'interval', time: { every: 6, unit: 'month' }, metric: { every: 5000 }, combine: 'all' }),
      'both must pass',
    )
    assert.equal(formatCombineNote({ kind: 'interval', time: { every: 6, unit: 'month' } }), null)
  })

  it('next label combines date + metric remaining', () => {
    const data = tracker({
      metric: { label: 'Mileage', unit: 'km' },
      rule: { kind: 'interval', time: { every: 6, unit: 'month' }, metric: { every: 5000 } },
      records: [{ id: 'b', at: '2026-08-22T00:00:00.000Z', metricValue: 51113 }],
    })
    assert.equal(formatNextLabel(data, now), 'in ~6 months · 5,000 km')
  })

  it('deadline next label shows expiry + time left', () => {
    const data = tracker({ rule: { kind: 'deadline', dueAt: '2028-01-23T00:00:00.000Z' }, records: [] })
    assert.equal(formatNextLabel(data, now), 'Expires Jan 23, 2028 · 1y 5m left')
  })

  it('formats currency with symbol in front of number', () => {
    assert.equal(isCurrencyUnit('₱'), true)
    assert.equal(isCurrencyUnit('PHP'), true)
    assert.equal(isCurrencyUnit('peso'), true)
    assert.equal(isCurrencyUnit('$'), true)
    assert.equal(isCurrencyUnit('USD'), true)
    assert.equal(isCurrencyUnit('km'), false)
    assert.equal(getCurrencySymbol('₱'), '₱')
    assert.equal(getCurrencySymbol('PHP'), '₱')
    assert.equal(getCurrencySymbol('$'), '$')

    assert.equal(formatMetricValue(999, '₱'), '₱999')
    assert.equal(formatMetricValue(999, 'PHP'), '₱999')
    assert.equal(formatMetricValue(2000, '₱'), '₱2,000')
    assert.equal(formatMetricValue(20, '$'), '$20')
    assert.equal(formatMetricValue(5000, 'km'), '5,000 km')

    const data = tracker({
      metric: { label: 'Price', unit: '₱' },
      rule: { kind: 'interval', time: { every: 1, unit: 'month' }, metric: { every: 999 } },
      records: [{ id: 'sub-1', at: '2026-08-22T00:00:00.000Z', metricValue: 999 }],
    })
    assert.equal(formatRecordLabel(currentRecord(data), data.metric), '₱999 · Aug 22, 2026')
    assert.equal(formatCadenceLabel(data.rule, data.metric), 'Every 1 month / ₱999')
  })
})

describe('JSON bridge', () => {
  it('reads tracker JSON from content and validates', () => {
    const data: TrackerData = {
      metric: { label: 'Mileage', unit: 'km' },
      rule: { kind: 'interval', time: { every: 6, unit: 'month' }, combine: 'first' },
      records: [{ id: 'b', at: '2026-08-22T00:00:00.000Z', metricValue: 51113 }],
    }
    const save = { type: 'tracker', content: serializeTrackerContent(data) } as Pick<Save, 'type' | 'content' | 'tracker'>
    const parsed = readTracker(save)
    assert.ok(parsed)
    assert.equal(parsed!.records.length, 1)
    assert.equal(parsed!.rule?.kind, 'interval')
  })

  it('non-tracker save reads null', () => {
    assert.equal(readTracker({ type: 'note', content: '{}' } as Pick<Save, 'type' | 'content' | 'tracker'>), null)
  })

  it('garbage content yields empty tracker, not a throw', () => {
    const parsed = readTracker({ type: 'tracker', content: 'not json' } as Pick<Save, 'type' | 'content' | 'tracker'>)
    assert.deepEqual(parsed, { records: [] })
  })

  it('drops invalid records and rules', () => {
    const parsed = readTracker({
      type: 'tracker',
      content: JSON.stringify({
        rule: { kind: 'interval' }, // no time/metric → dropped
        records: [{ at: 'nope' }, { id: 'ok', at: '2026-08-22T00:00:00.000Z' }],
      }),
    } as Pick<Save, 'type' | 'content' | 'tracker'>)
    assert.equal(parsed!.rule, undefined)
    assert.equal(parsed!.records.length, 1)
    assert.equal(parsed!.records[0]!.id, 'ok')
  })

  it('preserves autoLog flag in interval rule', () => {
    const data: TrackerData = {
      rule: { kind: 'interval', time: { every: 1, unit: 'month' }, autoLog: true },
      records: [{ id: 'b', at: '2026-08-22T00:00:00.000Z' }],
    }
    const save = { type: 'tracker', content: serializeTrackerContent(data) } as Pick<Save, 'type' | 'content' | 'tracker'>
    const parsed = readTracker(save)
    assert.ok(parsed)
    assert.equal(parsed!.rule?.kind, 'interval')
    assert.equal((parsed!.rule as { autoLog?: boolean }).autoLog, true)
  })
})

describe('autoLog and quick record', () => {
  it('catchupAutoLogRecords adds missing renewal records up to now', () => {
    const startData: TrackerData = {
      metric: { label: 'Price', unit: '₱' },
      rule: { kind: 'interval', time: { every: 1, unit: 'month' }, autoLog: true },
      records: [{ id: 'sub-1', at: '2026-06-15T00:00:00.000Z', metricValue: 999, label: 'Cursor Pro' }],
    }
    // With now = Aug 22, 2026, July 15 and Aug 15 have passed.
    const { data: updated, addedCount } = catchupAutoLogRecords(startData, now)
    assert.equal(addedCount, 2)
    assert.equal(updated.records.length, 3)
    assert.equal(updated.records[0].at, '2026-08-15T00:00:00.000Z')
    assert.equal(updated.records[0].metricValue, 999)
    assert.equal(updated.records[0].label, 'Cursor Pro')
    assert.equal(updated.records[1].at, '2026-07-15T00:00:00.000Z')
    assert.equal(updated.records[2].id, 'sub-1')

    // Next due after catchup should now be Sep 15, 2026
    const next = computeNextDue(updated, now)
    assert.equal(next?.dueAt, '2026-09-15T00:00:00.000Z')
  })

  it('catchupAutoLogRecords does nothing if autoLog is false or not due yet', () => {
    const data: TrackerData = {
      rule: { kind: 'interval', time: { every: 1, unit: 'month' }, autoLog: false },
      records: [{ id: 'sub-1', at: '2026-06-15T00:00:00.000Z' }],
    }
    const res1 = catchupAutoLogRecords(data, now)
    assert.equal(res1.addedCount, 0)
    assert.equal(res1.data.records.length, 1)

    const futureData: TrackerData = {
      rule: { kind: 'interval', time: { every: 1, unit: 'month' }, autoLog: true },
      records: [{ id: 'sub-1', at: '2026-08-20T00:00:00.000Z' }],
    }
    const res2 = catchupAutoLogRecords(futureData, now)
    assert.equal(res2.addedCount, 0)
  })

  it('createQuickRecord duplicates last record fields with current time', () => {
    const data: TrackerData = {
      metric: { label: 'Mileage', unit: 'km' },
      records: [{ id: 'old', at: '2026-01-01T00:00:00.000Z', metricValue: 50000, label: 'Oil change', note: 'Mobil 1' }],
    }
    const quick = createQuickRecord(data, now)
    assert.ok(quick.id)
    assert.notEqual(quick.id, 'old')
    assert.equal(quick.at, now.toISOString())
    assert.equal(quick.metricValue, 50000)
    assert.equal(quick.label, 'Oil change')
    assert.equal(quick.note, 'Mobil 1')
  })
})
