'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import DemoBanner from '@/components/DemoBanner'
import SaveList from '@/components/SaveList'
import {
  fetchCloudCollection,
  fetchCloudCollectionSaves,
  filterSavesForCollection,
  findCollectionById,
} from '@/lib/collections'
import { createClient } from '@/lib/supabase/client'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import type { Collection, Save } from '@/lib/types'
import styles from './CollectionDetailPage.module.css'

type Props = {
  id: string
}

export default function CollectionDetailPage({ id }: Props) {
  const { loading: sessionLoading, error: sessionError, saves, collections, mode, importFileName } =
    useLibrarySaves()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [collectionSaves, setCollectionSaves] = useState<Save[]>([])
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    if (sessionLoading || sessionError) return

    let cancelled = false

    async function load() {
      setDetailLoading(true)
      setDetailError('')

      if (mode === 'cloud') {
        try {
          const supabase = createClient()
          const [col, colSaves] = await Promise.all([
            fetchCloudCollection(supabase, id),
            fetchCloudCollectionSaves(supabase, id),
          ])
          if (!cancelled) {
            setCollection(col)
            setCollectionSaves(colSaves)
            setDetailLoading(false)
          }
        } catch (e) {
          if (!cancelled) {
            setDetailError(e instanceof Error ? e.message : 'Could not load collection.')
            setDetailLoading(false)
          }
        }
        return
      }

      const col = findCollectionById(collections, id)
      const colSaves = filterSavesForCollection(saves, id)
      if (!cancelled) {
        setCollection(col ?? null)
        setCollectionSaves(colSaves)
        setDetailLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [sessionLoading, sessionError, mode, id, saves, collections])

  const loading = sessionLoading || detailLoading
  const error = sessionError || detailError

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <nav className={styles.breadcrumb}>
        <Link href="/collections">Collections</Link>
        <span aria-hidden>›</span>
        <span>{collection?.name ?? 'Collection'}</span>
      </nav>

      {loading ? <p className={styles.status}>Loading collection…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && !collection ? (
        <div className={styles.missing}>
          <p>Collection not found.</p>
          <Link href="/collections">Back to collections</Link>
        </div>
      ) : null}

      {!loading && !error && collection ? (
        <>
          <h1 className={`serif ${styles.title}`}>{collection.name}</h1>
          {collection.description ? (
            <p className={styles.description}>{collection.description}</p>
          ) : null}
          <SaveList saves={collectionSaves} />
        </>
      ) : null}
    </AppShell>
  )
}
