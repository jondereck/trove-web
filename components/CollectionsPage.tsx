'use client'

import AppShell from '@/components/AppShell'
import CollectionGrid from '@/components/CollectionGrid'
import DemoBanner from '@/components/DemoBanner'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './CollectionsPage.module.css'

export default function CollectionsPage() {
  const { loading, error, collections, mode, importFileName } = useLibrarySaves()

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{collections.length} COLLECTIONS</p>
          <h1 className={`serif ${styles.title}`}>Collections</h1>
        </div>
      </div>

      <p className={styles.subtitle}>
        {mode === 'cloud' && 'Same folders as Trove mobile'}
        {mode === 'demo' && 'Demo folders · read-only preview'}
        {mode === 'import' && 'Folders from your imported file'}
      </p>

      {loading ? <p className={styles.status}>Loading collections…</p> : null}
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
