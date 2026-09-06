'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchCloudCollections } from '@/lib/collections'
import type { Collection } from '@/lib/types'
import styles from './MoveToCollectionSheet.module.css'

type Props = {
  visible: boolean
  onClose: () => void
  onSelect: (collectionId: string) => void
  title?: string
}

export default function MoveToCollectionSheet({
  visible,
  onClose,
  onSelect,
  title = 'Move to',
}: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setLoading(true)
    setError('')
    void (async () => {
      try {
        const supabase = createClient()
        const cols = await fetchCloudCollections(supabase)
        if (!cancelled) setCollections(cols)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load folders.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-labelledby="move-title"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="move-title">{title}</h2>
        {loading ? <p className={styles.hint}>Loading folders…</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        {!loading && collections.length === 0 ? (
          <p className={styles.hint}>No folders yet. Create one in Collections.</p>
        ) : null}
        <ul className={styles.list}>
          {collections.map(col => (
            <li key={col.id}>
              <button
                type="button"
                className={styles.row}
                onClick={() => {
                  onSelect(col.id)
                  onClose()
                }}
              >
                {col.name}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={styles.close} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
