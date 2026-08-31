'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { attachSaveCountsWithCovers, fetchCloudCollections } from '@/lib/collections'
import { getDemoLibrary } from '@/lib/demo'
import { readImport } from '@/lib/importStore'
import { fetchProfileFirstName } from '@/lib/library'
import { cacheSessionMetadata, peekLibrarySessionCache } from '@/lib/libraryCache'
import {
  getImportSession,
  getSessionMode,
  isDemoMode,
  type SessionMode,
} from '@/lib/sessionMode'
import type { Save } from '@/lib/types'
import type { CollectionWithCount } from '@/lib/collections'

export type LibraryState = {
  loading: boolean
  error: string
  saves: Save[]
  collections: CollectionWithCount[]
  mode: SessionMode
  importFileName?: string
  firstName?: string
}

function initialCloudState(): LibraryState {
  const cached = peekLibrarySessionCache()
  return {
    loading: !cached,
    error: '',
    saves: [],
    collections: cached?.collections ?? [],
    mode: 'cloud',
    firstName: cached?.firstName,
  }
}

export function useLibrarySaves(): LibraryState {
  const router = useRouter()
  const [state, setState] = useState<LibraryState>(initialCloudState)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const mode = getSessionMode()
      if (mode === 'demo' || isDemoMode()) {
        const demo = getDemoLibrary()
        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            saves: demo.saves,
            collections: attachSaveCountsWithCovers(demo.collections, demo.saves),
            mode: 'demo',
          })
        }
        return
      }

      const imported = getImportSession()
      if (mode === 'import' && imported) {
        try {
          const record = await readImport(imported.id)
          if (!record) throw new Error('Import expired. Choose the file again.')
          if (!cancelled) {
            setState({
              loading: false,
              error: '',
              saves: record.saves,
              collections: attachSaveCountsWithCovers(record.collections, record.saves),
              mode: 'import',
              importFileName: record.name,
            })
          }
        } catch (e) {
          if (!cancelled) {
            setState({
              loading: false,
              error: e instanceof Error ? e.message : 'Could not read imported saves.',
              saves: [],
              collections: [],
              mode: 'import',
              importFileName: imported.name,
            })
          }
        }
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
        return
      }

      try {
        const [collections, firstName] = await Promise.all([
          fetchCloudCollections(supabase),
          fetchProfileFirstName(supabase),
        ])
        cacheSessionMetadata({ collections, firstName })
        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            saves: [],
            collections,
            mode: 'cloud',
            firstName,
          })
        }
      } catch (e) {
        if (!cancelled) {
          const cached = peekLibrarySessionCache()
          setState({
            loading: false,
            error: cached
              ? ''
              : e instanceof Error
                ? e.message
                : 'Could not load library.',
            saves: [],
            collections: cached?.collections ?? [],
            mode: 'cloud',
            firstName: cached?.firstName,
          })
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  return state
}
