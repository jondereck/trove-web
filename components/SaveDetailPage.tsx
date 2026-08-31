'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import SaveDetail from '@/components/SaveDetail'
import TroveLoader from '@/components/TroveLoader'
import { findSaveById } from '@/lib/libraryCore'
import { fetchCloudSaveById } from '@/lib/library'
import { createClient } from '@/lib/supabase/client'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import type { Save } from '@/lib/types'
import styles from './SaveDetailPage.module.css'

type Props = {
  id: string
}

export default function SaveDetailPage({ id }: Props) {
  const { loading, error, saves, mode, importFileName, firstName } = useLibrarySaves()
  const [save, setSave] = useState<Save | undefined>()
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    if (loading || error) return

    let cancelled = false

    async function load() {
      setDetailLoading(true)
      setDetailError('')

      const local = findSaveById(saves, id)
      if (local) {
        if (!cancelled) {
          setSave(local)
          setDetailLoading(false)
        }
        return
      }

      if (mode === 'cloud') {
        try {
          const supabase = createClient()
          const row = await fetchCloudSaveById(supabase, id)
          if (!cancelled) {
            setSave(row ?? undefined)
            setDetailLoading(false)
          }
        } catch (e) {
          if (!cancelled) {
            setDetailError(e instanceof Error ? e.message : 'Could not load save.')
            setDetailLoading(false)
          }
        }
        return
      }

      if (!cancelled) {
        setSave(undefined)
        setDetailLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [loading, error, saves, mode, id])

  const showLoading = loading || detailLoading
  const showError = error || detailError

  return (
    <AppShell mode={mode} importFileName={importFileName} firstName={firstName}>
      {showLoading ? <TroveLoader label="Loading save…" /> : null}
      {showError ? <p className={styles.error}>{showError}</p> : null}
      {!showLoading && !showError && !save ? (
        <div className={styles.missing}>
          <p>Save not found.</p>
          <Link href="/library">Back to library</Link>
        </div>
      ) : null}
      {!showLoading && !showError && save ? <SaveDetail save={save} /> : null}
    </AppShell>
  )
}
