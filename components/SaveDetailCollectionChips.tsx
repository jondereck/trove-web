'use client'

import { useId, useRef } from 'react'
import { Plus } from 'lucide-react'
import type { Collection } from '@/lib/types'
import styles from './SaveDetailCollectionChips.module.css'

type Props = {
  collections: Collection[]
  selectedId?: string | null
  canEdit: boolean
  onSelect: (collectionId: string | null) => void
  onNavigateCollection?: (collectionId: string) => void
}

export default function SaveDetailCollectionChips({
  collections,
  selectedId,
  canEdit,
  onSelect,
  onNavigateCollection,
}: Props) {
  const selectId = useId()
  const selectRef = useRef<HTMLSelectElement>(null)
  const current = collections.find(c => c.id === selectedId)
  const others = collections.filter(c => c.id !== selectedId)

  const openPicker = () => {
    selectRef.current?.focus()
    selectRef.current?.click()
  }

  const handleCurrentClick = () => {
    if (current && onNavigateCollection) {
      onNavigateCollection(current.id)
      return
    }
    if (current) onSelect(current.id)
  }

  return (
    <section className={styles.section}>
      <span className={styles.label}>Collection</span>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.chip} ${!selectedId ? styles.chipActive : styles.chipMuted}`}
          onClick={() => canEdit && onSelect(null)}
          disabled={!canEdit}
        >
          None
        </button>

        {current ? (
          <button
            type="button"
            className={`${styles.chip} ${styles.chipActive}`}
            onClick={handleCurrentClick}
          >
            {current.color ? (
              <span className={styles.dot} style={{ backgroundColor: current.color }} aria-hidden />
            ) : null}
            <span className={styles.chipText}>{current.name}</span>
          </button>
        ) : null}

        {others.map(c => (
          <button
            key={c.id}
            type="button"
            className={styles.chip}
            onClick={() => canEdit && onSelect(c.id)}
            disabled={!canEdit}
          >
            {c.color ? (
              <span className={styles.dot} style={{ backgroundColor: c.color }} aria-hidden />
            ) : null}
            <span className={styles.chipText}>{c.name}</span>
          </button>
        ))}

        {canEdit && collections.length > 0 ? (
          <div className={styles.selectWrap}>
            <button type="button" className={`${styles.chip} ${styles.addChip}`} onClick={openPicker}>
              <Plus size={14} strokeWidth={2} />
              Add to collection
            </button>
            <select
              id={selectId}
              ref={selectRef}
              className={styles.hiddenSelect}
              value={selectedId ?? ''}
              onChange={e => onSelect(e.target.value || null)}
              aria-label="Choose collection"
            >
              <option value="">None</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </section>
  )
}
