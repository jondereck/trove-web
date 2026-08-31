'use client'

import AppShell from '@/components/AppShell'
import CollectionGrid from '@/components/CollectionGrid'
import DemoBanner from '@/components/DemoBanner'
import TroveLoader from '@/components/TroveLoader'
import { partitionPinned } from '@/lib/pinnedSections'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './CollectionsPage.module.css'

export default function CollectionsPage() {
  const { loading, error, collections, mode, importFileName, firstName } =
    useLibrarySaves()

  const { pinned, unpinned } = partitionPinned(collections)
  const hasPinned = pinned.length > 0

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <header className={styles.header}>
        <p className={styles.kicker}>
          <span className={styles.kickerCount}>{collections.length} COLLECTIONS</span>
        </p>
        <h1 className={`serif ${styles.title}`}>Collections</h1>
      </header>

      {loading && collections.length === 0 ? (
        <TroveLoader label="Loading collections…" />
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!error && (collections.length > 0 || !loading) ? (
        collections.length === 0 ? (
          <div className={styles.empty}>
            <p>No collections yet.</p>
            <span>Create folders in Trove mobile to organize saves.</span>
          </div>
        ) : hasPinned ? (
          <>
            <CollectionGrid collections={pinned} title="PINNED" titleTone="accent" />
            {unpinned.length > 0 ? (
              <CollectionGrid collections={unpinned} title="ALL COLLECTIONS" />
            ) : null}
          </>
        ) : (
          <CollectionGrid collections={collections} />
        )
      ) : null}
    </AppShell>
  )
}
