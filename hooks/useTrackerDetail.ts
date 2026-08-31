'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { findSaveById } from '@/lib/libraryCore'
import { fetchCloudSaveById } from '@/lib/library'
import { hydrateSave } from '@/lib/saveDetailCore'
import { deleteSave, updateSave } from '@/lib/saves'
import { createClient } from '@/lib/supabase/client'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import type { Save, TrackerData, TrackerRecord } from '@/lib/types'
import {
  catchupAutoLogRecords,
  emptyTrackerData,
  readTracker,
  removeRecord,
  serializeTrackerContent,
  upsertRecord,
} from '@/lib/tracker'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useTrackerDetail(id: string) {
  const router = useRouter()
  const { loading: sessionLoading, error: sessionError, saves, mode, importFileName } =
    useLibrarySaves()

  const [save, setSave] = useState<Save | null>(null)
  const [data, setData] = useState<TrackerData>(() => emptyTrackerData())
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveRef = useRef<Save | null>(null)

  const canEdit = mode === 'cloud'

  useEffect(() => {
    saveRef.current = save
  }, [save])

  useEffect(() => {
    if (sessionLoading || sessionError) return
    let cancelled = false

    async function load() {
      setDetailLoading(true)
      setDetailError('')

      const applyLoaded = async (row: Save | null) => {
        if (!row || row.type !== 'tracker') {
          if (!cancelled) {
            setSave(null)
            setDetailLoading(false)
          }
          return
        }

        const hydrated = hydrateSave(row)
        let trackerData = readTracker(hydrated) ?? emptyTrackerData()
        const caught = catchupAutoLogRecords(trackerData)
        trackerData = caught.data

        if (!cancelled) {
          setSave({ ...hydrated, tracker: trackerData })
          setData(trackerData)
          setDetailLoading(false)
        }

        if (caught.addedCount > 0 && mode === 'cloud') {
          const content = serializeTrackerContent(trackerData)
          const supabase = createClient()
          await updateSave(supabase, hydrated.id, { content })
        }
      }

      const local = findSaveById(saves, id)
      if (local) {
        await applyLoaded(local)
        return
      }

      if (mode === 'cloud') {
        try {
          const supabase = createClient()
          const row = await fetchCloudSaveById(supabase, id)
          await applyLoaded(row)
        } catch (e) {
          if (!cancelled) {
            setDetailError(e instanceof Error ? e.message : 'Could not load tracker.')
            setDetailLoading(false)
          }
        }
        return
      }

      await applyLoaded(findSaveById(saves, id) ?? null)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionLoading, sessionError, saves, mode, id])

  const persistData = useCallback(
    async (nextData: TrackerData): Promise<boolean> => {
      const current = saveRef.current
      if (!current) return false

      setSaveStatus('saving')
      setData(nextData)
      const content = serializeTrackerContent(nextData)
      const nextSave = { ...current, content, tracker: nextData }
      saveRef.current = nextSave
      setSave(nextSave)

      if (!canEdit) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
        return true
      }

      try {
        const supabase = createClient()
        const ok = await updateSave(supabase, current.id, { content })
        setSaveStatus(ok ? 'saved' : 'error')
        if (ok) setTimeout(() => setSaveStatus('idle'), 1500)
        return ok
      } catch {
        setSaveStatus('error')
        return false
      }
    },
    [canEdit],
  )

  const persistFields = useCallback(
    async (patch: Partial<Pick<Save, 'title' | 'description'>>): Promise<boolean> => {
      const current = saveRef.current
      if (!current || !canEdit) return false

      setSaveStatus('saving')
      const nextSave = { ...current, ...patch }
      saveRef.current = nextSave
      setSave(nextSave)

      try {
        const supabase = createClient()
        const ok = await updateSave(supabase, current.id, patch)
        setSaveStatus(ok ? 'saved' : 'error')
        if (ok) setTimeout(() => setSaveStatus('idle'), 1500)
        return ok
      } catch {
        setSaveStatus('error')
        return false
      }
    },
    [canEdit],
  )

  const upsertTrackerRecord = useCallback(
    async (record: TrackerRecord) => {
      return persistData(upsertRecord(data, record))
    },
    [data, persistData],
  )

  const deleteTrackerRecord = useCallback(
    async (recordId: string) => {
      return persistData(removeRecord(data, recordId))
    },
    [data, persistData],
  )

  const togglePin = useCallback(async () => {
    const current = saveRef.current
    if (!current || !canEdit) return false
    const nextPinned = !current.is_pinned
    setSaveStatus('saving')
    const nextSave = { ...current, is_pinned: nextPinned }
    saveRef.current = nextSave
    setSave(nextSave)
    try {
      const supabase = createClient()
      const ok = await updateSave(supabase, current.id, { is_pinned: nextPinned })
      setSaveStatus(ok ? 'saved' : 'error')
      if (ok) setTimeout(() => setSaveStatus('idle'), 1500)
      return ok
    } catch {
      setSaveStatus('error')
      return false
    }
  }, [canEdit])

  const removeTracker = useCallback(async () => {
    const current = saveRef.current
    if (!current || !canEdit) return false
    const supabase = createClient()
    const ok = await deleteSave(supabase, current.id)
    if (ok) router.push('/library')
    return ok
  }, [canEdit, router])

  return {
    save,
    data,
    mode,
    importFileName,
    loading: sessionLoading || detailLoading,
    error: sessionError || detailError,
    saveStatus,
    canEdit,
    persistData,
    persistFields,
    upsertTrackerRecord,
    deleteTrackerRecord,
    togglePin,
    removeTracker,
  }
}
