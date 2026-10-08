'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { DailyTasksState } from '@/lib/dailyTasks'
import TodayAgendaPanel from './TodayAgendaPanel'
import styles from './TodayAgendaModal.module.css'

type Props = {
  open: boolean
  state: DailyTasksState
  focusDateKey?: string
  onClose: () => void
}

export default function TodayAgendaModal({ open, state, focusDateKey, onClose }: Props) {
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
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agenda-title"
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.grabber} aria-hidden />
        <div className={styles.header}>
          <h2 id="agenda-title">Agenda</h2>
          <button type="button" className={styles.close} aria-label="Close agenda" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <TodayAgendaPanel state={state} focusDateKey={focusDateKey} variant="sheet" />
      </div>
    </div>
  )
}
