'use client'



import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import AppShell from '@/components/AppShell'

import DemoBanner from '@/components/DemoBanner'

import type { LibraryViewMode } from '@/components/FilterBar'

import LibraryHeader from '@/components/LibraryHeader'

import SaveBrowseBody from '@/components/SaveBrowseBody'

import TroveLoader from '@/components/TroveLoader'

import { usePaginatedSaves } from '@/hooks/usePaginatedSaves'

import { greetingForHour } from '@/lib/greeting'
import { consumeLibraryFilterIntent } from '@/lib/libraryFilterIntent'

import type { LibraryFilter } from '@/lib/libraryFilters'

import { fetchCloudLibraryStats } from '@/lib/library'

import { createClient } from '@/lib/supabase/client'

import { countsByType } from '@/lib/libraryCore'

import { useLibrarySaves } from '@/lib/useLibrarySaves'
import { playSuccess } from '@/lib/sounds'

import type { LibraryStats } from '@/lib/types'

import styles from './LibraryPage.module.css'



export default function LibraryPage() {

  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: sessionLoading, error: sessionError, saves: localSaves, mode, importFileName, firstName } =

    useLibrarySaves()

  useEffect(() => {
    if (searchParams.get('signed_in') !== '1') return
    playSuccess()
    router.replace('/library')
  }, [router, searchParams])

  const hour = new Date().getHours()

  const [filter, setFilter] = useState<LibraryFilter>('all')

  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid')

  useEffect(() => {
    const intent = consumeLibraryFilterIntent()
    if (intent) setFilter(intent)
  }, [])



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



  const error = sessionError || pageError

  const showFullLoader =
    (sessionLoading && mode === 'cloud' && saves.length === 0) ||
    (pageLoading && saves.length === 0)

  const saveTotal = stats?.total ?? total



  const emptyCopy = useMemo(() => {

    if (filter === 'all') {

      return {

        title: 'Nothing saved yet',

        hint: 'Save links, notes, and images in Trove mobile.',

      }

    }

    if (filter === 'unread') {

      return { title: 'All caught up', hint: 'Every item in your library has been opened at least once.' }

    }

    if (filter === 'reminders') {

      return { title: 'No upcoming reminders', hint: 'Saves with an active reminder will show up here.' }

    }

    return { title: 'No matches', hint: 'Try a different filter or save something new.' }

  }, [filter])



  return (

    <AppShell mode={mode} importFileName={importFileName}>

      {mode === 'demo' ? <DemoBanner /> : null}



      <LibraryHeader

        greeting={`${greetingForHour(hour, firstName)}.`}

        saveTotal={saveTotal}

        filter={filter}

        onFilterChange={setFilter}

        viewMode={viewMode}

        onViewModeChange={setViewMode}

      />



      {showFullLoader ? <TroveLoader label="Loading library…" /> : null}

      {error ? <p className={styles.error}>{error}</p> : null}



      {!showFullLoader && !error ? (

        <SaveBrowseBody

          saves={saves}

          layout={viewMode}

          loadingMore={loadingMore}

          hasMore={hasMore}

          onLoadMore={loadMore}

          emptyTitle={emptyCopy.title}

          emptyHint={emptyCopy.hint}

          canEdit={mode === 'cloud'}

        />

      ) : null}

    </AppShell>

  )

}


