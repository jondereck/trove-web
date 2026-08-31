'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LIBRARY_INITIAL_PAGE, LIBRARY_LOAD_MORE } from '@/constants/library'
import { fetchCloudCollectionSavesPage } from '@/lib/collections'
import { fetchCloudLibrarySavesPage } from '@/lib/library'
import { cachePageSnapshot, peekPageCache } from '@/lib/libraryCache'
import { hasMorePages, paginateFilteredSaves } from '@/lib/pagination'
import { createClient } from '@/lib/supabase/client'
import type { LibraryFilter, Save, SavesPageResult } from '@/lib/types'
import type { SessionMode } from '@/lib/sessionMode'

type Options = {
  mode: SessionMode
  filter?: LibraryFilter
  collectionId?: string
  localSaves?: Save[]
  enabled?: boolean
}

export function usePaginatedSaves({
  mode,
  filter = 'all',
  collectionId,
  localSaves = [],
  enabled = true,
}: Options) {
  const [saves, setSaves] = useState<Save[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const loadingMoreRef = useRef(false)

  const fetchPage = useCallback(
    async (offset: number, limit: number): Promise<SavesPageResult> => {
      if (mode === 'cloud') {
        const supabase = createClient()
        if (collectionId) {
          return fetchCloudCollectionSavesPage(supabase, collectionId, offset, limit, filter)
        }
        return fetchCloudLibrarySavesPage(supabase, offset, limit, filter)
      }

      const { page, total: localTotal } = paginateFilteredSaves(localSaves, filter, offset, limit)
      return { saves: page, total: localTotal }
    },
    [mode, collectionId, localSaves, filter],
  )

  const loadInitial = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      setError('')
      try {
        const result = await fetchPage(0, LIBRARY_INITIAL_PAGE)
        setSaves(result.saves)
        setTotal(result.total)
        if (mode === 'cloud' && result.saves.length > 0) {
          cachePageSnapshot({
            saves: result.saves,
            total: result.total,
            filter,
            collectionId,
          })
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load saves.')
        if (showLoading) {
          setSaves([])
          setTotal(0)
        }
      } finally {
        setLoading(false)
      }
    },
    [collectionId, fetchPage, filter, mode],
  )

  useEffect(() => {
    if (!enabled) return

    if (mode !== 'cloud') {
      const { page, total: localTotal } = paginateFilteredSaves(
        localSaves,
        filter,
        0,
        LIBRARY_INITIAL_PAGE,
      )
      setSaves(page)
      setTotal(localTotal)
      setLoading(false)
      setError('')
      return
    }

    const cached = peekPageCache(filter, collectionId)
    const hasCache = !!cached?.saves.length
    if (hasCache) {
      setSaves(cached.saves)
      setTotal(cached.total)
      setLoading(false)
    } else {
      setSaves([])
      setTotal(0)
      setLoading(true)
    }

    void loadInitial(!hasCache)
  }, [enabled, filter, collectionId, mode, localSaves, loadInitial])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMorePages(saves.length, total)) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const result = await fetchPage(saves.length, LIBRARY_LOAD_MORE)
      setSaves(prev => {
        const seen = new Set(prev.map(s => s.id))
        const next = result.saves.filter(s => !seen.has(s.id))
        return [...prev, ...next]
      })
      setTotal(result.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more saves.')
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [fetchPage, saves.length, total])

  return {
    saves,
    total,
    loading,
    loadingMore,
    error,
    loadMore,
    hasMore: hasMorePages(saves.length, total),
    reload: () => loadInitial(saves.length === 0),
  }
}
