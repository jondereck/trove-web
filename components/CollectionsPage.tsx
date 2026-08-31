'use client'

import AppShell from '@/components/AppShell'
import CollectionGrid from '@/components/CollectionGrid'
import DemoBanner from '@/components/DemoBanner'
import TroveLoader from '@/components/TroveLoader'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './CollectionsPage.module.css'

export default function CollectionsPage() {
  const { loading, error, collections, mode, importFileName, firstName } =
    useLibrarySaves()

  return (
    <AppShell mode={mode} importFileName={importFileName} firstName={firstName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <header className={styles.header}>
        <p className={styles.kicker}>
          <span className={styles.kickerCount}>{collections.length} COLLECTIONS</span>
        </p>
        <h1 className={`serif ${styles.title}`}>Collections</h1>
      </header>

      {loading ? <TroveLoader label="Loading collections…" /> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error ? (
        collections.length === 0 ? (
          <div className={styles.empty}>
            <p>No collections yet.</p>
            <span>Create folders in Trove mobile to organize saves.</span>
          </div>
        ) : (
          <CollectionGrid collections={collections} />
        )
      ) : null}
    </AppShell>
  )
}
