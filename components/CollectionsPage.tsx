'use client'

import AppShell from '@/components/AppShell'
import CollectionCard from '@/components/CollectionCard'
import DemoBanner from '@/components/DemoBanner'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './CollectionsPage.module.css'

export default function CollectionsPage() {
  const { loading, error, collections, mode, importFileName } = useLibrarySaves()

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <h1 className={`serif ${styles.title}`}>Collections</h1>
      <p className={styles.subtitle}>
        {mode === 'cloud' && 'Folders from your Trove Cloud library'}
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
          <div className={styles.card}>
            <div className={styles.head}>
              <h2>All collections</h2>
              <span>{collections.length}</span>
            </div>
            <div>
              {collections.map(collection => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </div>
        )
      ) : null}
    </AppShell>
  )
}
