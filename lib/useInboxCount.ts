'use client'

import { useEffect, useState } from 'react'
import { getDemoLibrary } from './demo'
import { fetchCloudInboxCount, INBOX_CHANGED, inboxCountLabel, selectInboxSaves } from './inbox'
import { readImport } from './importStore'
import { getImportSession, type SessionMode } from './sessionMode'
import { createClient } from './supabase/client'

export function useInboxCount(mode: SessionMode): string | null {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        let next = 0
        if (mode === 'demo') {
          next = selectInboxSaves(getDemoLibrary().saves).length
        } else if (mode === 'import') {
          const session = getImportSession()
          const record = session ? await readImport(session.id) : null
          next = selectInboxSaves(record?.saves ?? []).length
        } else if (mode === 'cloud') {
          next = await fetchCloudInboxCount(createClient())
        }
        if (!cancelled) setCount(next)
      } catch {
        if (!cancelled) setCount(0)
      }
    }

    void load()
    const onChange = () => {
      void load()
    }
    window.addEventListener(INBOX_CHANGED, onChange)
    return () => {
      cancelled = true
      window.removeEventListener(INBOX_CHANGED, onChange)
    }
  }, [mode])

  return inboxCountLabel(count)
}
