'use client'

import { useEffect, useState } from 'react'
import styles from './MoveToCollectionSheet.module.css'

type Props = {
  visible: boolean
  onClose: () => void
  onApply: (tags: string[]) => void
  count: number
}

function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[,#\n]+/)) {
    const tag = part.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
  }
  return out
}

export default function BulkEditTagsSheet({ visible, onClose, onApply, count }: Props) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (visible) setValue('')
  }, [visible])

  if (!visible) return null

  const apply = () => {
    const tags = parseTags(value)
    if (!tags.length) return
    onApply(tags)
    onClose()
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-labelledby="tags-title"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="tags-title">Edit tags</h2>
        <p className={styles.hint}>
          Add tags to {count} {count === 1 ? 'save' : 'saves'} (comma-separated). Existing tags are kept.
        </p>
        <input
          className={styles.field}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="design, web-development"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              apply()
            }
          }}
        />
        <button type="button" className={styles.primary} onClick={apply}>
          Apply tags
        </button>
        <button type="button" className={styles.close} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
