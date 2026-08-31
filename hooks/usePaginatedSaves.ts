'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LIBRARY_INITIAL_PAGE, LIBRARY_LOAD_MORE } from '@/constants/library'
import { fetchCloudCollectionSavesPage } from '@/lib/collections'
import { fetchCloudLibrarySavesPage } from '@/lib/library'
import { hasMorePages, paginateLocalSaves } from '@/lib/pagination'
import { createClient } from '@/lib/supabase/client'
import type { Save, SavesPageResult } from '@/lib/types'
import type { SessionMode } from '@/lib/sessionMode'

type Options = {
  mode: SessionMode
  collectionId?: string
  localSaves?: Save[]
  enabled?: boolean
}

export function usePaginatedSaves({
  mode,
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
          return fetchCloudCollectionSavesPage(supabase, collectionId, offset, limit)
        }
        return fetchCloudLibrarySavesPage(supabase, offset, limit)
      }

      const { page, total: localTotal } = paginateLocalSaves(localSaves, offset, limit)
      return { saves: page, total: localTotal }
    },
    [mode, collectionId, localSaves],
  )

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchPage(0, LIBRARY_INITIAL_PAGE)
      setSaves(result.saves)
      setTotal(result.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saves.')
      setSaves([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  useEffect(() => {
    if (!enabled) return
    void loadInitial()
  }, [enabled, loadInitial])

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
    reload: loadInitial,
  }
}
