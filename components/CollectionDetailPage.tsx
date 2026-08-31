'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import DemoBanner from '@/components/DemoBanner'
import LoadMoreFooter from '@/components/LoadMoreFooter'
import SaveGrid from '@/components/SaveGrid'
import { usePaginatedSaves } from '@/hooks/usePaginatedSaves'
import { filterSavesForCollection, findCollectionById } from '@/lib/collections'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './CollectionDetailPage.module.css'

type Props = {
  id: string
}

export default function CollectionDetailPage({ id }: Props) {
  const { loading: sessionLoading, error: sessionError, saves: localSaves, collections, mode, importFileName } =
    useLibrarySaves()

  const localCollectionSaves = useMemo(
    () => (mode === 'cloud' ? [] : filterSavesForCollection(localSaves, id)),
    [mode, localSaves, id],
  )

  const collection = findCollectionById(collections, id)

  const {
    saves,
    total,
    loading: pageLoading,
    loadingMore,
    error: pageError,
    loadMore,
  } = usePaginatedSaves({
    mode,
    collectionId: mode === 'cloud' ? id : undefined,
    localSaves: localCollectionSaves,
    enabled: !sessionLoading && !sessionError && (mode === 'cloud' || !!collection),
  })

  const loading = sessionLoading || (mode === 'cloud' ? pageLoading : sessionLoading)
  const error = sessionError || pageError

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

      {!loading && !error && !collection && mode !== 'cloud' ? (
        <div className={styles.missing}>
          <p>Collection not found.</p>
          <Link href="/collections">Back to collections</Link>
        </div>
      ) : null}

      {!loading && !error && (collection || mode === 'cloud') ? (
        <>
          <h1 className={`serif ${styles.title}`}>{collection?.name ?? 'Collection'}</h1>
          {collection?.description ? (
            <p className={styles.description}>{collection.description}</p>
          ) : null}
          <SaveGrid
            saves={saves}
            emptyTitle="No saves in this collection yet."
            emptyHint="Add saves to this folder in Trove mobile."
          />
          <LoadMoreFooter
            loaded={saves.length}
            total={total}
            loading={loadingMore}
            onLoadMore={loadMore}
          />
        </>
      ) : null}
    </AppShell>
  )
}
