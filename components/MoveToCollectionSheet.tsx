'use client'

import { useEffect, useMemo, useState } from 'react'
import { Folder, FolderPlus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchCloudCollections, upsertCollectionByName } from '@/lib/collections'
import {
  getRecentCollectionIds,
  recordCollectionUse,
  sortCollectionsByRecent,
} from '@/lib/recentCollections'
import type { Collection } from '@/lib/types'
import { WEB_UNSORTED_LABEL } from '@/lib/quickSavePreview'
import styles from './MoveToCollectionSheet.module.css'

type Props = {
  visible: boolean
  onClose: () => void
  onSelect: (collectionId: string) => void
  /** Called when a new collection is created from the sheet. */
  onCreated?: (collection: Collection) => void
  title?: string
  showUnsorted?: boolean
  unsortedLabel?: string
  onSelectUnsorted?: () => void
}

export default function MoveToCollectionSheet({
  visible,
  onClose,
  onSelect,
  onCreated,
  title = 'Move to…',
  showUnsorted = false,
  unsortedLabel = WEB_UNSORTED_LABEL,
  onSelectUnsorted,
}: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setError('')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    setRecentIds(getRecentCollectionIds())
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

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    const list = q
      ? collections.filter(c => c.name.toLowerCase().includes(q))
      : sortCollectionsByRecent(collections, recentIds)
    return list
  }, [collections, recentIds, q])

  const pinned = useMemo(
    () => (q ? [] : filtered.filter(c => c.is_pinned)),
    [filtered, q],
  )
  const pinnedIds = useMemo(() => new Set(pinned.map(c => c.id)), [pinned])
  const rest = useMemo(
    () => filtered.filter(c => !pinnedIds.has(c.id)),
    [filtered, pinnedIds],
  )

  const canCreate =
    !!q && !collections.some(c => c.name.toLowerCase() === q) && !creating

  const pick = (id: string) => {
    recordCollectionUse(id)
    setRecentIds(getRecentCollectionIds())
    onSelect(id)
    onClose()
  }

  const createFromSearch = async () => {
    const name = query.trim()
    if (!name || creating) return
    setCreating(true)
    setError('')
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sign in to create a folder.')
      const id = await upsertCollectionByName(supabase, user.id, name)
      if (!id) throw new Error('Could not create folder.')
      const created: Collection = {
        id,
        user_id: user.id,
        name,
        icon: 'folder-outline',
        color: '#c0613c',
        created_at: new Date().toISOString(),
      }
      setCollections(prev => (prev.some(c => c.id === id) ? prev : [...prev, created]))
      onCreated?.(created)
      pick(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create folder.')
    } finally {
      setCreating(false)
    }
  }

  if (!visible) return null

  const renderRow = (col: Collection) => (
    <li key={col.id}>
      <button type="button" className={styles.row} onClick={() => pick(col.id)}>
        <span className={styles.rowIcon} style={{ color: col.color ?? 'var(--trove-accent)' }}>
          <Folder size={18} strokeWidth={1.75} />
        </span>
        <span className={styles.rowName}>{col.name}</span>
      </button>
    </li>
  )

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-labelledby="move-title"
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />
        <h2 id="move-title">{title}</h2>

        <div className={styles.searchRow}>
          <Search size={16} strokeWidth={1.75} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search folders"
            autoFocus
          />
        </div>

        {loading ? <p className={styles.hint}>Loading folders…</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <ul className={styles.list}>
          {showUnsorted && !q ? (
            <li>
              <button
                type="button"
                className={styles.row}
                onClick={() => {
                  onSelectUnsorted?.()
                  onClose()
                }}
              >
                <span className={styles.rowIcon}>
                  <Folder size={18} strokeWidth={1.75} />
                </span>
                <span className={styles.rowName}>{unsortedLabel}</span>
              </button>
            </li>
          ) : null}

          {canCreate ? (
            <li>
              <button
                type="button"
                className={styles.createRow}
                onClick={() => void createFromSearch()}
                disabled={creating}
              >
                <span className={styles.createIcon}>
                  <FolderPlus size={18} strokeWidth={1.75} />
                </span>
                <span className={styles.createName}>
                  {creating ? 'Creating…' : `Create “${query.trim()}”`}
                </span>
              </button>
            </li>
          ) : null}

          {!loading && pinned.length > 0 ? (
            <>
              <li className={styles.sectionLabel}>Pinned</li>
              {pinned.map(renderRow)}
            </>
          ) : null}

          {!loading && rest.length > 0 ? (
            <>
              {!q && pinned.length > 0 ? (
                <li className={styles.sectionLabel}>All collections</li>
              ) : null}
              {rest.map(renderRow)}
            </>
          ) : null}

          {!loading && !canCreate && filtered.length === 0 ? (
            <li>
              <p className={styles.hint}>
                {q ? 'No matching folders.' : 'No folders yet. Type a name to create one.'}
              </p>
            </li>
          ) : null}
        </ul>

        <button type="button" className={styles.close} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
