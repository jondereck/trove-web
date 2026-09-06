'use client'

import { CheckSquare, FileStack, X } from 'lucide-react'
import styles from './SelectionModeHeader.module.css'

type Props = {
  count: number
  onSelectAll: () => void
  onCancel: () => void
  itemTotal?: number
  title?: string
}

export default function SelectionModeHeader({
  count,
  onSelectAll,
  onCancel,
  itemTotal,
  title = 'Library',
}: Props) {
  return (
    <div className={styles.wrap} role="toolbar" aria-label="Selection">
      <div className={styles.left}>
        <h1 className={`serif ${styles.title}`}>{title}</h1>
        {typeof itemTotal === 'number' ? (
          <p className={styles.meta}>{itemTotal} items</p>
        ) : null}
      </div>

      <div className={styles.right}>
        <span className={styles.badge}>
          <FileStack size={14} strokeWidth={2} aria-hidden />
          {count} selected
        </span>
        <button type="button" className={styles.action} onClick={onSelectAll}>
          <CheckSquare size={15} strokeWidth={1.75} aria-hidden />
          Select all
        </button>
        <button type="button" className={styles.action} onClick={onCancel}>
          <X size={15} strokeWidth={1.75} aria-hidden />
          Clear selection
        </button>
      </div>
    </div>
  )
}
