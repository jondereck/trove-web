'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Pin,
  Plus,
  Repeat,
  Trash2,
  Zap,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import TroveLoader from '@/components/TroveLoader'
import TrackerCalendar from '@/components/TrackerCalendar'
import { useTrackerDetail, type SaveStatus } from '@/hooks/useTrackerDetail'
import { libraryBackHref } from '@/lib/libraryFilterUrl'
import type { TrackerRecord } from '@/lib/types'
import {
  computeNextDue,
  computeRecordGapStats,
  createQuickRecord,
  formatCadenceValue,
  formatCombineNote,
  formatDate,
  formatDateWithWeekday,
  formatElapsedDuration,
  formatMetricValue,
  formatRecordLabel,
  relativeDayBadge,
  sortRecords,
  upsertRecord,
} from '@/lib/tracker'
import styles from './TrackerDetailPage.module.css'

type Props = {
  id: string
}

type RecordDraft = {
  at: string
  metricValue: string
  label: string
  note: string
}

function saveStatusLabel(saveStatus: SaveStatus): string | null {
  if (saveStatus === 'saving') return 'Saving…'
  if (saveStatus === 'saved') return 'Saved'
  if (saveStatus === 'error') return 'Could not save'
  return null
}

function toDraft(record?: TrackerRecord | null): RecordDraft {
  if (!record) {
    const now = new Date()
    now.setSeconds(0, 0)
    return {
      at: now.toISOString().slice(0, 16),
      metricValue: '',
      label: '',
      note: '',
    }
  }
  const at = new Date(record.at)
  return {
    at: Number.isFinite(at.getTime()) ? at.toISOString().slice(0, 16) : '',
    metricValue: typeof record.metricValue === 'number' ? String(record.metricValue) : '',
    label: record.label ?? '',
    note: record.note ?? '',
  }
}

const TIMELINE_PREVIEW = 4

export default function TrackerDetailPage({ id }: Props) {
  const searchParams = useSearchParams()
  const detail = useTrackerDetail(id)
  const [title, setTitle] = useState('')
  const [tip, setTip] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingTip, setEditingTip] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TrackerRecord | null>(null)
  const [draft, setDraft] = useState<RecordDraft>(() => toDraft())
  const [showAllRecords, setShowAllRecords] = useState(false)

  const save = detail.save
  const data = detail.data
  const backHref = libraryBackHref(searchParams.get('from'), 'tracker')

  useEffect(() => {
    if (!save) return
    if (!editingTitle) setTitle(save.title)
    if (!editingTip) setTip(save.description ?? '')
  }, [save, editingTitle, editingTip])

  const now = useMemo(() => new Date(), [])
  const records = sortRecords(data.records)
  const visibleRecords = showAllRecords ? records : records.slice(0, TIMELINE_PREVIEW)
  const next = computeNextDue(data, now)
  const cadenceValue = formatCadenceValue(data.rule, data.metric)
  const combineNote = formatCombineNote(data.rule)
  const gaps = useMemo(() => computeRecordGapStats(data), [data])
  const dayBadge = next?.dueAt ? relativeDayBadge(next.dueAt, now) : null

  const metricPrimary = data.metric
    ? (() => {
        const curr = records[0]
        if (curr && typeof curr.metricValue === 'number') {
          return formatMetricValue(curr.metricValue, data.metric.unit)
        }
        return data.metric.label || data.metric.unit || '—'
      })()
    : '—'
  const metricSub = data.metric?.label
    ? data.metric.unit
    : data.metric
      ? 'Metric'
      : 'Not set'

  const rulePrimary = cadenceValue ? `Every ${cadenceValue}` : data.rule?.kind === 'deadline' ? 'Deadline' : '—'
  const ruleSub = data.rule
    ? data.rule.kind === 'deadline'
      ? 'One-time'
      : `Recurring · ${combineNote === 'both must pass' ? 'Both' : 'Whichever first'}`
    : 'Not set'

  const nextPrimary = next?.dueAt
    ? formatDateWithWeekday(next.dueAt)
    : next?.dueMetric != null && data.metric
      ? formatMetricValue(next.dueMetric, data.metric.unit)
      : '—'

  const streakPrimary =
    gaps.sincePreviousMs != null ? formatElapsedDuration(gaps.sincePreviousMs) : '—'

  if (detail.loading) {
    return (
      <AppShell mode={detail.mode} importFileName={detail.importFileName}>
        <TroveLoader label="Loading tracker…" />
      </AppShell>
    )
  }

  if (detail.error) {
    return (
      <AppShell mode={detail.mode} importFileName={detail.importFileName}>
        <p className={styles.error}>{detail.error}</p>
      </AppShell>
    )
  }

  if (!save) {
    return (
      <AppShell mode={detail.mode} importFileName={detail.importFileName}>
        <div className={styles.missing}>
          <p>Tracker not found.</p>
          <Link href={backHref}>Back to library</Link>
        </div>
      </AppShell>
    )
  }

  const statusText = saveStatusLabel(detail.saveStatus)

  const openAddRecord = () => {
    setEditingRecord(null)
    setDraft(toDraft())
    setRecordOpen(true)
  }

  const openEditRecord = (record: TrackerRecord) => {
    setEditingRecord(record)
    setDraft(toDraft(record))
    setRecordOpen(true)
  }

  const submitRecord = () => {
    const at = new Date(draft.at)
    if (!Number.isFinite(at.getTime())) return
    const metricValue = draft.metricValue.trim() ? Number(draft.metricValue) : undefined
    const record: TrackerRecord = editingRecord
      ? {
          ...editingRecord,
          at: at.toISOString(),
          ...(metricValue != null && Number.isFinite(metricValue) ? { metricValue } : {}),
          label: draft.label.trim() || undefined,
          note: draft.note.trim() || undefined,
        }
      : {
          id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: at.toISOString(),
          ...(metricValue != null && Number.isFinite(metricValue) ? { metricValue } : {}),
          label: draft.label.trim() || undefined,
          note: draft.note.trim() || undefined,
        }
    void detail.upsertTrackerRecord(record)
    setRecordOpen(false)
    setEditingRecord(null)
  }

  const handleQuickLog = () => {
    void detail.persistData(upsertRecord(data, createQuickRecord(data)))
  }

  return (
    <AppShell mode={detail.mode} importFileName={detail.importFileName}>
      {!detail.canEdit ? (
        <p className={styles.readOnlyHint}>Sign in with Trove Cloud to edit trackers on web.</p>
      ) : null}

      <div className={styles.wrap}>
        <div className={styles.topBar}>
          <Link href={backHref} className={styles.back}>
            <ArrowLeft size={16} strokeWidth={2} />
            Library
          </Link>
          <div className={styles.headerActions}>
            {statusText ? <span className={styles.status}>{statusText}</span> : null}
            <button
              type="button"
              className={`${styles.iconBtn} ${save.is_pinned ? styles.iconBtnActive : ''}`}
              onClick={() => void detail.togglePin()}
              disabled={!detail.canEdit}
              aria-label={save.is_pinned ? 'Unpin tracker' : 'Pin tracker'}
            >
              <Pin size={18} strokeWidth={2} fill={save.is_pinned ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              onClick={() => {
                if (window.confirm('Delete this tracker and all its records?')) {
                  void detail.removeTracker()
                }
              }}
              disabled={!detail.canEdit}
              aria-label="Delete tracker"
            >
              <Trash2 size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.typeBadge}>TRACKER</span>
          {data.rule?.kind === 'interval' && data.rule.autoLog ? (
            <span className={styles.autoLogBadge}>
              <Repeat size={12} />
              Auto-log
            </span>
          ) : null}
        </div>

        {editingTitle && detail.canEdit ? (
          <textarea
            className={`${styles.titleInput} serif`}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => {
              setEditingTitle(false)
              const nextTitle = title.trim()
              if (nextTitle && nextTitle !== save.title) void detail.persistFields({ title: nextTitle })
              else setTitle(save.title)
            }}
            autoFocus
            rows={2}
          />
        ) : (
          <button
            type="button"
            className={styles.titleButton}
            onClick={() => detail.canEdit && setEditingTitle(true)}
            disabled={!detail.canEdit}
          >
            <h1 className={`${styles.title} serif`}>{save.title || 'Untitled tracker'}</h1>
          </button>
        )}

        {editingTip && detail.canEdit ? (
          <textarea
            className={styles.tipInput}
            value={tip}
            onChange={e => setTip(e.target.value)}
            onBlur={() => {
              setEditingTip(false)
              const nextTip = tip.trim()
              if (nextTip !== (save.description ?? '')) {
                void detail.persistFields({ description: nextTip || undefined })
              }
            }}
            placeholder="Why it matters (optional)"
            autoFocus
            rows={3}
          />
        ) : tip ? (
          <button
            type="button"
            className={styles.tipButton}
            onClick={() => detail.canEdit && setEditingTip(true)}
            disabled={!detail.canEdit}
          >
            <p className={styles.tip}>{tip}</p>
          </button>
        ) : detail.canEdit ? (
          <button type="button" className={styles.tipPlaceholder} onClick={() => setEditingTip(true)}>
            <Plus size={14} strokeWidth={2.25} />
            Add a note
          </button>
        ) : null}

        <section className={styles.setupCard} aria-label="Setup">
          <p className={styles.setupLabel}>
            <LayoutGrid size={12} strokeWidth={2} aria-hidden />
            SETUP
          </p>
          <div className={styles.setupGrid}>
            <div className={styles.setupCell}>
              <p className={styles.setupValue}>{metricPrimary}</p>
              <p className={styles.setupKey}>Metric</p>
              <p className={styles.setupSub}>{metricSub}</p>
            </div>
            <div className={styles.setupCell}>
              <p className={styles.setupValue}>{rulePrimary}</p>
              <p className={styles.setupKey}>Rule</p>
              <p className={styles.setupSub}>{ruleSub}</p>
            </div>
            <div className={styles.setupCell}>
              <p className={styles.setupValue}>
                {nextPrimary}
                {dayBadge ? <span className={styles.tomorrowBadge}>{dayBadge}</span> : null}
              </p>
              <p className={styles.setupKey}>Next expected</p>
            </div>
            <div className={styles.setupCell}>
              <p className={`${styles.setupValue} ${gaps.sincePreviousMs != null ? styles.setupAccent : ''}`}>
                {streakPrimary}
              </p>
              <p className={styles.setupKey}>Streak</p>
              <p className={styles.setupSub}>
                {gaps.sincePreviousMs != null ? 'since previous' : 'Need 2+ records'}
              </p>
            </div>
          </div>
        </section>

        <div className={styles.columns}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <p className={styles.sectionLabel}>RECORDS TIMELINE</p>
              <div className={styles.recordsActions}>
                {records.length > 0 && detail.canEdit ? (
                  <button type="button" className={styles.quickLogBtn} onClick={handleQuickLog}>
                    <Zap size={13} />
                    Log today
                  </button>
                ) : null}
                {detail.canEdit ? (
                  <button type="button" className={styles.addRecordBtn} onClick={openAddRecord}>
                    <Plus size={16} />
                    Add record
                  </button>
                ) : null}
              </div>
            </div>

            {records.length === 0 ? (
              <button
                type="button"
                className={styles.emptyRecords}
                onClick={detail.canEdit ? openAddRecord : undefined}
                disabled={!detail.canEdit}
              >
                <Plus size={22} />
                <span>Log the first record</span>
              </button>
            ) : (
              <>
                <div className={styles.timeline}>
                  {visibleRecords.map((record, index) => {
                    const nextOlder = records[index + 1]
                    const gapMs =
                      nextOlder && Number.isFinite(Date.parse(record.at)) && Number.isFinite(Date.parse(nextOlder.at))
                        ? Math.abs(Date.parse(record.at) - Date.parse(nextOlder.at))
                        : null
                    return (
                      <button
                        key={record.id}
                        type="button"
                        className={styles.recordRow}
                        onClick={() => detail.canEdit && openEditRecord(record)}
                        disabled={!detail.canEdit}
                      >
                        <div className={styles.timelineRail}>
                          <span
                            className={`${styles.timelineDot} ${index === 0 ? styles.timelineDotActive : ''}`}
                          />
                          {index < visibleRecords.length - 1 ? (
                            <span className={styles.timelineLine} />
                          ) : null}
                        </div>
                        <div className={styles.recordBody}>
                          <div className={styles.recordTopRow}>
                            <span className={styles.recordDate}>{formatDate(record.at)}</span>
                            {index === 0 ? <span className={styles.currentTag}>CURRENT</span> : null}
                            <ChevronRight size={16} className={styles.recordChevron} aria-hidden />
                          </div>
                          <p className={styles.recordMeta}>{formatRecordLabel(record, data.metric)}</p>
                          {record.note ? <p className={styles.recordNote}>{record.note}</p> : null}
                          {gapMs != null ? (
                            <p className={styles.sinceLine}>
                              {formatElapsedDuration(gapMs)} since previous
                            </p>
                          ) : index === records.length - 1 ? (
                            <p className={styles.sinceMuted}>—</p>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {records.length > TIMELINE_PREVIEW ? (
                  <button
                    type="button"
                    className={styles.viewAllBtn}
                    onClick={() => setShowAllRecords(v => !v)}
                  >
                    {showAllRecords ? 'Show fewer' : 'View all records'}
                    <ChevronDown
                      size={14}
                      className={showAllRecords ? styles.viewAllChevronOpen : undefined}
                    />
                  </button>
                ) : null}
              </>
            )}
          </section>

          <section className={styles.panel}>
            {data.calendarView !== false ? (
              <TrackerCalendar records={records} dueAt={next?.dueAt} />
            ) : (
              <div className={styles.calendarOff}>
                <p className={styles.sectionLabel}>CALENDAR</p>
                <p className={styles.calendarOffHint}>Calendar view is off for this tracker.</p>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <p className={styles.sectionLabel}>SUMMARY</p>
            <div className={styles.summaryStack}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryKey}>Total records</p>
                <p className={styles.summaryValue}>{gaps.totalRecords}</p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryKey}>Longest gap</p>
                <p className={styles.summaryValue}>
                  {gaps.longestGapMs != null ? formatElapsedDuration(gaps.longestGapMs) : '—'}
                </p>
                {gaps.longestGapFrom && gaps.longestGapTo ? (
                  <p className={styles.summarySub}>
                    {formatDate(gaps.longestGapFrom)} – {formatDate(gaps.longestGapTo)}
                  </p>
                ) : null}
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryKey}>Average gap</p>
                <p className={styles.summaryValue}>
                  {gaps.averageGapMs != null ? formatElapsedDuration(gaps.averageGapMs) : '—'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {recordOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setRecordOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-labelledby="record-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="record-title" className="serif">
              {editingRecord ? 'Edit record' : 'Add record'}
            </h2>
            <label className={styles.field}>
              <span>Date &amp; time</span>
              <input
                type="datetime-local"
                value={draft.at}
                onChange={e => setDraft(current => ({ ...current, at: e.target.value }))}
              />
            </label>
            {data.metric ? (
              <label className={styles.field}>
                <span>
                  {data.metric.label || 'Value'} ({data.metric.unit})
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft.metricValue}
                  onChange={e => setDraft(current => ({ ...current, metricValue: e.target.value }))}
                />
              </label>
            ) : null}
            <label className={styles.field}>
              <span>Label (optional)</span>
              <input
                type="text"
                value={draft.label}
                onChange={e => setDraft(current => ({ ...current, label: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span>Note (optional)</span>
              <textarea
                value={draft.note}
                onChange={e => setDraft(current => ({ ...current, note: e.target.value }))}
                rows={3}
              />
            </label>
            <div className={styles.modalActions}>
              {editingRecord ? (
                <button
                  type="button"
                  className={styles.modalDanger}
                  onClick={() => {
                    void detail.deleteTrackerRecord(editingRecord.id)
                    setRecordOpen(false)
                    setEditingRecord(null)
                  }}
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className={styles.modalRight}>
                <button type="button" className={styles.modalSecondary} onClick={() => setRecordOpen(false)}>
                  Cancel
                </button>
                <button type="button" className={styles.modalPrimary} onClick={submitRecord}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
