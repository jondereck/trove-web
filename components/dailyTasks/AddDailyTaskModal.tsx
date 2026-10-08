'use client'

import { useEffect, useState } from 'react'
import {
  addDays,
  dateKey,
  type DailyTask,
  type NewDailyTaskInput,
} from '@/lib/dailyTasks'
import styles from './AddDailyTaskModal.module.css'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type Props = {
  open: boolean
  editing?: DailyTask | null
  onClose: () => void
  onSave: (input: NewDailyTaskInput) => void | Promise<void>
  onUpdate?: (id: string, input: NewDailyTaskInput) => void | Promise<void>
}

export default function AddDailyTaskModal({
  open,
  editing,
  onClose,
  onSave,
  onUpdate,
}: Props) {
  const [title, setTitle] = useState('')
  const [schedule, setSchedule] = useState<'today' | 'tomorrow' | 'custom'>('today')
  const [customDate, setCustomDate] = useState('')
  const [withTime, setWithTime] = useState(false)
  const [hour, setHour] = useState(9)
  const [minute, setMinute] = useState(0)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setSchedule('custom')
      setCustomDate(editing.scheduledOn ?? dateKey(new Date()))
      setWithTime(editing.hour != null)
      setHour(editing.hour ?? 9)
      setMinute(editing.minute ?? 0)
      setWeekdays(editing.weekdays ?? [])
    } else {
      setTitle('')
      setSchedule('today')
      setCustomDate(dateKey(new Date()))
      setWithTime(false)
      setHour(9)
      setMinute(0)
      setWeekdays([])
    }
    setSaving(false)
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const toggleDay = (day: number) => {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b),
    )
  }

  const submit = async () => {
    const trimmed = title.trim()
    if (!trimmed || saving) return
    let scheduledOn: string | undefined
    if (schedule === 'today') scheduledOn = dateKey(new Date())
    else if (schedule === 'tomorrow') scheduledOn = dateKey(addDays(new Date(), 1))
    else if (customDate) scheduledOn = customDate

    const input: NewDailyTaskInput = {
      title: trimmed,
      hour: withTime ? hour : null,
      minute: withTime ? minute : null,
      weekdays: weekdays.length ? weekdays : undefined,
      scheduledOn,
    }

    setSaving(true)
    try {
      if (editing && onUpdate) await onUpdate(editing.id, input)
      else await onSave(input)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const primaryLabel = editing
    ? 'Save'
    : schedule === 'tomorrow'
      ? 'Add task for tomorrow'
      : schedule === 'custom' && customDate
        ? `Add task for ${customDate}`
        : 'Add task'

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-daily-task-title"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="add-daily-task-title" className={styles.title}>
          {editing ? 'Edit daily task' : 'New daily task'}
        </h2>

        <label className={styles.label} htmlFor="daily-task-title">
          Title
        </label>
        <input
          id="daily-task-title"
          className={styles.input}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void submit()
            }
          }}
          placeholder="What do you need to do?"
          autoFocus
        />

        <p className={styles.label}>Schedule</p>
        <div className={styles.chips}>
          {(
            [
              ['today', 'Today'],
              ['tomorrow', 'Tomorrow'],
              ['custom', 'Custom'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${styles.chip} ${schedule === id ? styles.chipOn : ''}`}
              onClick={() => setSchedule(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {schedule === 'custom' ? (
          <input
            type="date"
            className={styles.input}
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
          />
        ) : null}

        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={withTime}
            onChange={e => setWithTime(e.target.checked)}
          />
          Remind me at a time
        </label>
        {withTime ? (
          <div className={styles.timeRow}>
            <select value={hour} onChange={e => setHour(Number(e.target.value))} aria-label="Hour">
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}
                </option>
              ))}
            </select>
            <select
              value={minute}
              onChange={e => setMinute(Number(e.target.value))}
              aria-label="Minute"
            >
              {[0, 15, 30, 45].map(m => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <p className={styles.label}>Repeat (optional)</p>
        <div className={styles.weekdays}>
          {DAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              className={`${styles.day} ${weekdays.includes(day) ? styles.dayOn : ''}`}
              onClick={() => toggleDay(day)}
              aria-pressed={weekdays.includes(day)}
              aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.save}
            disabled={!title.trim() || saving}
            onClick={() => void submit()}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
