'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import DemoBanner from '@/components/DemoBanner'
import LoadMoreFooter from '@/components/LoadMoreFooter'
import SaveGrid from '@/components/SaveGrid'
import SummaryChips from '@/components/SummaryChips'
import { usePaginatedSaves } from '@/hooks/usePaginatedSaves'
import { greetingForHour, weekdayLabel } from '@/lib/greeting'
import { fetchCloudLibraryStats } from '@/lib/library'
import { createClient } from '@/lib/supabase/client'
import { countsByType } from '@/lib/libraryCore'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import type { LibraryStats } from '@/lib/types'
import styles from './LibraryPage.module.css'

export default function LibraryPage() {
  const { loading: sessionLoading, error: sessionError, saves: localSaves, mode, importFileName, firstName } =
    useLibrarySaves()
  const hour = new Date().getHours()

  const {
    saves,
    total,
    loading: pageLoading,
    loadingMore,
    error: pageError,
    loadMore,
  } = usePaginatedSaves({
    mode,
    localSaves,
    enabled: !sessionLoading && !sessionError,
  })

  const [stats, setStats] = useState<LibraryStats | null>(null)

  useEffect(() => {
    if (sessionLoading || sessionError) return
    if (mode === 'cloud') {
      const supabase = createClient()
      fetchCloudLibraryStats(supabase)
        .then(setStats)
        .catch(() => setStats(null))
      return
    }
    const localStats = countsByType(localSaves)
    setStats({ total: localStats.total, notes: localStats.notes, links: localStats.links })
  }, [sessionLoading, sessionError, mode, localSaves])

  const loading = sessionLoading || pageLoading
  const error = sessionError || pageError

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <p className={styles.date}>{weekdayLabel()}</p>
      <h1 className={`serif ${styles.greeting}`}>{greetingForHour(hour, firstName)}</h1>

      <div className={styles.insight}>
        {mode === 'cloud' && (
          <span>
            Your Cloud library · {stats?.total ?? total} saves · read-only on web
          </span>
        )}
        {mode === 'demo' && <span>Demo library · read-only preview</span>}
        {mode === 'import' && <span>Imported file · read-only preview</span>}
      </div>

      {loading ? <p className={styles.status}>Loading library…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && stats ? (
        <>
          <SummaryChips total={stats.total} notes={stats.notes} links={stats.links} />
          <SaveGrid saves={saves} />
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
