'use client'

import {
  ExternalLink,
  ImageIcon,
  Pencil,
  Share2,
  StickyNote,
} from 'lucide-react'
import styles from './SaveDetailToolbar.module.css'

type Props = {
  canEdit: boolean
  hasUrl?: boolean
  onAddNote?: () => void
  onChangeCover?: () => void
  onAdjustTitle?: () => void
  onShare?: () => void
  onOpen?: () => void
}

export default function SaveDetailToolbar({
  canEdit,
  hasUrl,
  onAddNote,
  onChangeCover,
  onAdjustTitle,
  onShare,
  onOpen,
}: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.group}>
          <button
            type="button"
            className={styles.btn}
            onClick={onAddNote}
            disabled={!canEdit || !onAddNote}
          >
            <StickyNote size={16} strokeWidth={2} />
            <span className={styles.btnLabel}>Add note</span>
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={onChangeCover}
            disabled={!canEdit || !onChangeCover}
          >
            <ImageIcon size={16} strokeWidth={2} />
            <span className={styles.btnLabel}>Change cover</span>
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={onAdjustTitle}
            disabled={!canEdit || !onAdjustTitle}
          >
            <Pencil size={16} strokeWidth={2} />
            <span className={styles.btnLabel}>Adjust title</span>
          </button>
        </div>

        <span className={styles.divider} aria-hidden />

        <div className={styles.group}>
          <button type="button" className={styles.btn} onClick={onShare} disabled={!onShare}>
            <Share2 size={16} strokeWidth={2} />
            <span className={styles.btnLabel}>Share</span>
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={onOpen}
            disabled={!hasUrl || !onOpen}
          >
            <ExternalLink size={16} strokeWidth={2} />
            <span className={styles.btnLabel}>Open</span>
          </button>
        </div>
      </div>
    </div>
  )
}
