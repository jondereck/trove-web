'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import DemoBanner from '@/components/DemoBanner'
import MoveToCollectionSheet from '@/components/MoveToCollectionSheet'
import SaveBrowseBody from '@/components/SaveBrowseBody'
import TroveLoader from '@/components/TroveLoader'
import { fetchCloudInboxSaves, notifyInboxChanged, selectInboxSaves } from '@/lib/inbox'
import { updateSave } from '@/lib/saves'
import { createClient } from '@/lib/supabase/client'
import type { Save } from '@/lib/types'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './UnsortedPage.module.css'

export default function UnsortedPage() {
  const { loading: sessionLoading, error: sessionError, saves: localSaves, mode, importFileName } =
    useLibrarySaves()
  const [saves, setSaves] = useState<Save[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)
  const canEdit = mode === 'cloud'

  useEffect(() => {
    if (sessionLoading) return
    if (sessionError) {
      setError(sessionError)
      setLoading(false)
      return
    }
    if (mode !== 'cloud') {
      setSaves(selectInboxSaves(localSaves))
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    void fetchCloudInboxSaves(createClient())
      .then(rows => {
        if (!cancelled) setSaves(rows)
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load unsorted saves.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionLoading, sessionError, mode, localSaves])

  const handleMove = async (collectionId: string) => {
    if (!movingId) return
    const id = movingId
    setMovingId(null)
    if (canEdit) {
      const ok = await updateSave(createClient(), id, { collection_id: collectionId, is_inbox: false })
      if (!ok) {
        setError('Could not move that save.')
        return
      }
    }
    setSaves(prev => prev.filter(save => save.id !== id))
    notifyInboxChanged()
  }

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <header className={styles.header}>
        <p className={styles.kicker}>
          <span className={styles.kickerCount}>{saves.length} UNSORTED</span>
        </p>
        <h1 className={`serif ${styles.title}`}>Unsorted</h1>
      </header>

      {loading ? <TroveLoader label="Loading unsorted…" /> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error ? (
        <SaveBrowseBody
          saves={saves}
          layout="grid"
          loadingMore={false}
          hasMore={false}
          onLoadMore={() => {}}
          emptyTitle="Nothing unsorted"
          emptyHint="New saves land here until you move them into a collection."
          canEdit={canEdit}
          onMove={canEdit ? setMovingId : undefined}
        />
      ) : null}

      <MoveToCollectionSheet
        visible={movingId != null}
        onClose={() => setMovingId(null)}
        onSelect={collectionId => {
          void handleMove(collectionId)
        }}
      />
    </AppShell>
  )
}
