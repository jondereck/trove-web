'use client'

import { ChevronRight, Folder, Lock } from 'lucide-react'
import styles from './SaveToDestination.module.css'

export type SaveToDestDisplay = {
  id: string
  label: string
  icon?: string
  color?: string
}

export type SaveToRecentFolder = {
  id: string
  label: string
  color?: string
}

type Props = {
  sectionLabel?: string
  destination: SaveToDestDisplay | null | undefined
  subtitle: string
  fallbackLabel: string
  emptyIcon?: 'folder' | 'lock'
  recentFolders: SaveToRecentFolder[]
  onOpenPicker: () => void
  onPickRecent: (folder: SaveToRecentFolder) => void
}

export default function SaveToDestination({
  sectionLabel = 'Save to',
  destination,
  subtitle,
  fallbackLabel,
  emptyIcon = 'folder',
  recentFolders,
  onOpenPicker,
  onPickRecent,
}: Props) {
  const label = destination?.label ?? fallbackLabel

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.label}>{sectionLabel}</p>
        <button type="button" className={styles.change} onClick={onOpenPicker}>
          Change
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      <button
        type="button"
        className={styles.card}
        onClick={onOpenPicker}
        aria-label={`Save to ${label}`}
      >
        <span className={styles.iconWrap} style={destination?.color ? { color: destination.color } : undefined}>
          {emptyIcon === 'lock' ? (
            <Lock size={20} strokeWidth={1.75} />
          ) : (
            <Folder size={20} strokeWidth={1.75} />
          )}
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{label}</span>
          <span className={styles.sub}>{subtitle}</span>
        </span>
        <ChevronRight size={18} strokeWidth={1.75} className={styles.chevron} />
      </button>

      {recentFolders.length > 0 ? (
        <div className={styles.recentBlock}>
          <p className={styles.recentLabel}>Recent folders</p>
          <div className={styles.recentRow}>
            {recentFolders.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={styles.recentChip}
                onClick={() => onPickRecent(opt)}
              >
                <Folder size={14} strokeWidth={1.75} style={opt.color ? { color: opt.color } : undefined} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
