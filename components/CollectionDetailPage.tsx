'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import DemoBanner from '@/components/DemoBanner'
import FilterBar, { type LibraryViewMode } from '@/components/FilterBar'
import SaveBrowseBody from '@/components/SaveBrowseBody'
import TroveLoader from '@/components/TroveLoader'
import { usePaginatedSaves } from '@/hooks/usePaginatedSaves'
import { filterSavesForCollection, findCollectionById } from '@/lib/collections'
import type { LibraryFilter } from '@/lib/libraryFilters'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './CollectionDetailPage.module.css'

type Props = {
  id: string
}

export default function CollectionDetailPage({ id }: Props) {
  const { loading: sessionLoading, error: sessionError, saves: localSaves, collections, mode, importFileName, firstName } =
    useLibrarySaves()

  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid')

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
    hasMore,
  } = usePaginatedSaves({
    mode,
    filter,
    collectionId: mode === 'cloud' ? id : undefined,
    localSaves: localCollectionSaves,
    enabled: !sessionLoading && !sessionError && (mode === 'cloud' || !!collection),
  })

  const loading = sessionLoading || (mode === 'cloud' ? pageLoading : sessionLoading)
  const error = sessionError || pageError

  return (
    <AppShell mode={mode} importFileName={importFileName} firstName={firstName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <nav className={styles.breadcrumb}>
        <Link href="/collections">Collections</Link>
        <span aria-hidden>›</span>
        <span>{collection?.name ?? 'Collection'}</span>
      </nav>

      <header className={styles.header}>
        <p className={styles.kicker}>
          <span className={styles.kickerCount}>{total} SAVES</span>
        </p>
        <h1 className={`serif ${styles.title}`}>{collection?.name ?? 'Collection'}</h1>
        {collection?.description ? (
          <p className={styles.description}>{collection.description}</p>
        ) : null}
      </header>

      <div className={styles.filterBar}>
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {loading ? <TroveLoader label="Loading collection…" /> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && !collection && mode !== 'cloud' ? (
        <div className={styles.missing}>
          <p>Collection not found.</p>
          <Link href="/collections">Back to collections</Link>
        </div>
      ) : null}

      {!loading && !error && (collection || mode === 'cloud') ? (
        <SaveBrowseBody
          saves={saves}
          layout={viewMode}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          showPinned={false}
          emptyTitle="No saves in this collection yet."
          emptyHint="Add saves to this folder in Trove mobile."
        />
      ) : null}
    </AppShell>
  )
}
