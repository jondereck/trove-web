'use client'

import { useEffect } from 'react'
import { Bell, Copy, Search, Share2, Trash2, X } from 'lucide-react'
import styles from './SaveDetailMoreSheet.module.css'

type Props = {
  open: boolean
  onClose: () => void
  onReminder?: () => void
  onFindInNote?: () => void
  onCopy?: () => void
  onShare?: () => void
  onDelete?: () => void
}

export default function SaveDetailMoreSheet({
  open,
  onClose,
  onReminder,
  onFindInNote,
  onCopy,
  onShare,
  onDelete,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const run = (fn?: () => void) => {
    fn?.()
    onClose()
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="More actions"
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.title}>More</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {onReminder ? (
          <button type="button" className={styles.item} onClick={() => run(onReminder)}>
            <Bell size={18} strokeWidth={2} className={styles.icon} />
            Reminder
          </button>
        ) : null}

        {onFindInNote ? (
          <button type="button" className={styles.item} onClick={() => run(onFindInNote)}>
            <Search size={18} strokeWidth={2} className={styles.icon} />
            Find in note
          </button>
        ) : null}

        {onCopy ? (
          <button type="button" className={styles.item} onClick={() => run(onCopy)}>
            <Copy size={18} strokeWidth={2} className={styles.icon} />
            Copy
          </button>
        ) : null}

        {onShare ? (
          <button type="button" className={styles.item} onClick={() => run(onShare)}>
            <Share2 size={18} strokeWidth={2} className={styles.icon} />
            Share
          </button>
        ) : null}

        {onDelete ? (
          <button
            type="button"
            className={`${styles.item} ${styles.itemDanger}`}
            onClick={() => run(onDelete)}
          >
            <Trash2 size={18} strokeWidth={2} className={styles.icon} />
            Delete
          </button>
        ) : null}
      </div>
    </div>
  )
}
