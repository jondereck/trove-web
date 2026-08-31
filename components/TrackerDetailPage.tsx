'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pin, Plus, Repeat, Trash2, Zap } from 'lucide-react'
import AppShell from '@/components/AppShell'
import TroveLoader from '@/components/TroveLoader'
import TrackerCalendar from '@/components/TrackerCalendar'
import { useTrackerDetail, type SaveStatus } from '@/hooks/useTrackerDetail'
import type { TrackerRecord } from '@/lib/types'
import {
  computeNextDue,
  computeStatus,
  createQuickRecord,
  formatCadenceValue,
  formatCombineNote,
  formatCountdownAmount,
  formatDate,
  formatDateLong,
  formatElapsedDuration,
  formatMetricValue,
  formatRecordLabel,
  previousRecord,
  sortRecords,
  statusLabel,
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

function statusDotClass(status: ReturnType<typeof computeStatus>): string {
  if (status === 'overdue' || status === 'expired') return styles.statusOverdue
  if (status === 'due_soon') return styles.statusSoon
  if (status === 'on_track' || status === 'active') return styles.statusOk
  return styles.statusMuted
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

export default function TrackerDetailPage({ id }: Props) {
  const detail = useTrackerDetail(id)
  const [title, setTitle] = useState('')
  const [tip, setTip] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingTip, setEditingTip] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TrackerRecord | null>(null)
  const [draft, setDraft] = useState<RecordDraft>(() => toDraft())

  const save = detail.save
  const data = detail.data

  useEffect(() => {
    if (!save) return
    if (!editingTitle) setTitle(save.title)
    if (!editingTip) setTip(save.description ?? '')
  }, [save, editingTitle, editingTip])

  const now = useMemo(() => new Date(), [])
  const records = sortRecords(data.records)
  const status = computeStatus(data, now)
  const next = computeNextDue(data, now)
  const cadenceValue = formatCadenceValue(data.rule, data.metric)
  const combineNote = formatCombineNote(data.rule)
  const prev = previousRecord(data)
  const curr = records[0] ?? null
  const sinceDays =
    curr && prev
      ? Math.round((Date.parse(curr.at) - Date.parse(prev.at)) / 86_400_000)
      : null
  const sinceMetric =
    curr && prev && typeof curr.metricValue === 'number' && typeof prev.metricValue === 'number'
      ? curr.metricValue - prev.metricValue
      : null

  const dueMs = next?.dueAt ? Date.parse(next.dueAt) - now.getTime() : null
  const overdue = dueMs != null && dueMs < 0
  const countdownPrimary =
    dueMs != null
      ? formatCountdownAmount(dueMs)
      : next?.dueMetric != null && data.metric
        ? formatMetricValue(next.dueMetric, data.metric.unit)
        : null
  const countdownCaption =
    dueMs != null
      ? data.rule?.kind === 'deadline'
        ? overdue
          ? 'Expired'
          : 'Expires in'
        : overdue
          ? 'Overdue'
          : 'Next due in'
      : next?.dueMetric != null
        ? 'Next at'
        : null
  const countdownSecondary = next?.dueAt ? formatDateLong(next.dueAt) : null

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
          <Link href="/library">Back to library</Link>
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
        <Link href="/library" className={styles.back}>
          <ArrowLeft size={16} strokeWidth={2} />
          Library
        </Link>

        <header className={styles.header}>
          <div />
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
        </header>

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
            + Add a note
          </button>
        ) : null}

        <p className={styles.sectionLabel}>OVERVIEW</p>
        <section className={styles.overviewCard}>
          {countdownPrimary || cadenceValue ? (
            <div className={styles.overviewSplit}>
              <div className={styles.overviewCol}>
                <p className={styles.overviewCaption}>{countdownCaption ?? statusLabel(status) ?? 'Tracked'}</p>
                <p className={`${styles.overviewHero} ${statusDotClass(status)}`}>{countdownPrimary ?? '—'}</p>
                {countdownSecondary ? <p className={styles.overviewSub}>{countdownSecondary}</p> : null}
              </div>
              {cadenceValue ? (
                <>
                  <div className={styles.overviewDivider} />
                  <div className={styles.overviewCol}>
                    <p className={styles.overviewCaption}>
                      {data.rule?.kind === 'deadline' ? 'Deadline' : 'Every'}
                    </p>
                    <p className={styles.overviewHero}>{cadenceValue}</p>
                    {combineNote ? <p className={styles.overviewNote}>{combineNote}</p> : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className={styles.overviewEmpty}>
              <p className={styles.overviewHero}>Set metric &amp; rule</p>
              <p className={styles.overviewSub}>
                {records.length
                  ? 'Edit setup in Trove mobile to predict what’s next.'
                  : 'Add a first record in Trove mobile, then set a rule.'}
              </p>
            </div>
          )}
        </section>

        {data.calendarView ? <TrackerCalendar records={records} dueAt={next?.dueAt} /> : null}

        <div className={styles.recordsHeader}>
          <p className={styles.sectionLabel}>RECORDS</p>
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
          <div className={styles.timeline}>
            {records.map((record, index) => (
              <button
                key={record.id}
                type="button"
                className={styles.recordRow}
                onClick={() => detail.canEdit && openEditRecord(record)}
                disabled={!detail.canEdit}
              >
                <div className={styles.timelineRail}>
                  <span className={`${styles.timelineDot} ${index === 0 ? styles.timelineDotActive : ''}`} />
                  {index < records.length - 1 ? <span className={styles.timelineLine} /> : null}
                </div>
                <div className={styles.recordBody}>
                  <div className={styles.recordTopRow}>
                    <span className={styles.recordLabel}>
                      {record.label || (index === 0 ? 'Latest record' : 'Record')}
                    </span>
                    {index === 0 ? <span className={styles.currentTag}>CURRENT</span> : null}
                  </div>
                  <p className={styles.recordMeta}>{formatRecordLabel(record, data.metric)}</p>
                  {record.note ? <p className={styles.recordNote}>{record.note}</p> : null}
                  {index === 0 && (sinceDays != null || sinceMetric != null) ? (
                    <div className={styles.sinceBox}>
                      {sinceDays != null ? (
                        <div className={styles.sinceCol}>
                          <span className={styles.sinceValue}>
                            {formatElapsedDuration(Math.abs(sinceDays) * 86_400_000)}
                          </span>
                          <span className={styles.sinceLabel}>since previous</span>
                        </div>
                      ) : null}
                      {sinceMetric != null && data.metric ? (
                        <div className={styles.sinceCol}>
                          <span className={styles.sinceValue}>
                            {formatMetricValue(sinceMetric, data.metric.unit)}
                          </span>
                          <span className={styles.sinceLabel}>since previous</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}

        <p className={styles.savedDate}>Created {formatDate(save.created_at)}</p>
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
