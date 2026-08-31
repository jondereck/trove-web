'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDemoLibrary } from '@/lib/demo'
import { fetchCloudLibrarySaves, fetchProfileFirstName } from '@/lib/library'
import {
  getImportSession,
  getSessionMode,
  isDemoMode,
  type SessionMode,
} from '@/lib/sessionMode'
import type { Save } from '@/lib/types'

export type LibraryState = {
  loading: boolean
  error: string
  saves: Save[]
  mode: SessionMode
  importFileName?: string
  firstName?: string
}

export function useLibrarySaves(): LibraryState {
  const router = useRouter()
  const [state, setState] = useState<LibraryState>({
    loading: true,
    error: '',
    saves: [],
    mode: 'cloud',
  })

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
            mode: 'demo',
          })
        }
        return
      }

      const imported = getImportSession()
      if (mode === 'import' && imported) {
        try {
          const saves = JSON.parse(imported.savesJson) as Save[]
          if (!cancelled) {
            setState({
              loading: false,
              error: '',
              saves,
              mode: 'import',
              importFileName: imported.name,
            })
          }
        } catch {
          if (!cancelled) {
            setState({
              loading: false,
              error: 'Could not read imported saves.',
              saves: [],
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
        const [saves, firstName] = await Promise.all([
          fetchCloudLibrarySaves(supabase),
          fetchProfileFirstName(supabase),
        ])
        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            saves,
            mode: 'cloud',
            firstName,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            loading: false,
            error: e instanceof Error ? e.message : 'Could not load library.',
            saves: [],
            mode: 'cloud',
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
