'use client'

import { useEffect, useState } from 'react'
import styles from './AddDailyTaskModal.module.css'

type Props = {
  open: boolean
  initialDate: string
  title?: string
  onClose: () => void
  onConfirm: (dateKey: string) => void
}

export default function RescheduleDateModal({
  open,
  initialDate,
  title = 'Choose date',
  onClose,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialDate)

  useEffect(() => {
    if (open) setValue(initialDate)
  }, [open, initialDate])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="reschedule-title" className={styles.title}>
          {title}
        </h2>
        <label className={styles.label} htmlFor="reschedule-date">
          Date
        </label>
        <input
          id="reschedule-date"
          type="date"
          className={styles.input}
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
        />
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.save}
            onClick={() => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                onConfirm(value)
                onClose()
              }
            }}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  )
}
