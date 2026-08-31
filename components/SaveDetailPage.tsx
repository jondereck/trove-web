'use client'

import Link from 'next/link'
import AppShell from '@/components/AppShell'
import SaveDetail from '@/components/SaveDetail'
import { findSaveById } from '@/lib/libraryCore'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './SaveDetailPage.module.css'

type Props = {
  id: string
}

export default function SaveDetailPage({ id }: Props) {
  const { loading, error, saves, mode, importFileName } = useLibrarySaves()
  const save = findSaveById(saves, id)

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {loading ? <p>Loading…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!loading && !error && !save ? (
        <div className={styles.missing}>
          <p>Save not found.</p>
          <Link href="/library">Back to library</Link>
        </div>
      ) : null}
      {!loading && !error && save ? <SaveDetail save={save} /> : null}
    </AppShell>
  )
}
