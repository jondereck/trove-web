'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { findSaveById } from '@/lib/libraryCore'
import { fetchCloudSaveById } from '@/lib/library'
import {
  remindersForSave,
  removeLocalReminder,
  upsertLocalReminder,
  loadReminderStore,
} from '@/lib/reminderStore'
import {
  storeRemindersForSave,
  syncReminderStoreWithCloud,
  upsertCloudReminder,
  softDeleteCloudReminder,
} from '@/lib/reminderCloud'
import { applySavePatch, bodyFieldForType, hydrateSave, readSaveBody } from '@/lib/saveDetailCore'
import { toggleChecklistAt } from '@/lib/noteChecklist'
import { repairThumbnail } from '@/lib/thumbnailRepair'
import { deleteSave, updateSave } from '@/lib/saves'
import { createClient } from '@/lib/supabase/client'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import type { Collection } from '@/lib/types'
import type { Save, SaveUpdate } from '@/lib/types'
import type { StoredSaveReminder } from '@/lib/saveRemindersCore'
import { formatCurrentReminder, reminderPresets } from '@/lib/saveRemindersCore'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useSaveDetail(id: string) {
  const router = useRouter()
  const { loading: sessionLoading, error: sessionError, saves, collections, mode, importFileName } =
    useLibrarySaves()

  const [save, setSave] = useState<Save | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [reminders, setReminders] = useState<StoredSaveReminder[]>([])
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingBody, setEditingBody] = useState(false)
  const [refreshingPreview, setRefreshingPreview] = useState(false)
  const userIdRef = useRef<string | null>(null)

  const canEdit = mode === 'cloud'

  useEffect(() => {
    if (sessionLoading || sessionError) return
    let cancelled = false

    async function load() {
      setDetailLoading(true)
      setDetailError('')

      const local = findSaveById(saves, id)
      if (local) {
        const hydrated = hydrateSave(local)
        if (!cancelled) {
          setSave(hydrated)
          setReminders(remindersForSave(loadReminderStore(), id))
          setDetailLoading(false)
        }
        return
      }

      if (mode === 'cloud') {
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          userIdRef.current = user?.id ?? null
          const [row, store] = await Promise.all([
            fetchCloudSaveById(supabase, id),
            syncReminderStoreWithCloud(supabase),
          ])
          if (!cancelled) {
            setSave(row ? hydrateSave(row) : null)
            setReminders(storeRemindersForSave(store, id))
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

      const demo = findSaveById(saves, id)
      if (!cancelled) {
        setSave(demo ? hydrateSave(demo) : null)
        setReminders(remindersForSave(loadReminderStore(), id))
        setDetailLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionLoading, sessionError, saves, mode, id])

  const persist = useCallback(
    async (patch: SaveUpdate): Promise<boolean> => {
      if (!save) return false
      if (!canEdit) return false

      setSaveStatus('saving')
      setSave(prev => (prev ? applySavePatch(prev, patch) : prev))

      try {
        const supabase = createClient()
        const ok = await updateSave(supabase, save.id, patch)
        setSaveStatus(ok ? 'saved' : 'error')
        if (ok) {
          setTimeout(() => setSaveStatus('idle'), 1500)
        }
        return ok
      } catch {
        setSaveStatus('error')
        return false
      }
    },
    [canEdit, save],
  )

  const updateTitle = useCallback(
    async (title: string) => {
      if (!save || title.trim() === save.title) return true
      return persist({ title: title.trim() })
    },
    [persist, save],
  )

  const updateBody = useCallback(
    async (body: string) => {
      if (!save) return false
      const field = bodyFieldForType(save.type)
      return persist({ [field]: body } as SaveUpdate)
    },
    [persist, save],
  )

  const moveToCollection = useCallback(
    async (collectionId: string | null) => {
      return persist({ collection_id: collectionId ?? undefined })
    },
    [persist],
  )

  const setTags = useCallback(
    async (tags: string[]) => {
      return persist({ tags: tags.slice(0, 5) })
    },
    [persist],
  )

  const togglePin = useCallback(async () => {
    if (!save) return false
    return persist({ is_pinned: !save.is_pinned })
  }, [persist, save])

  const toggleChecklistItem = useCallback(
    async (lineIndex: number) => {
      if (!save) return false
      const body = readSaveBody(save)
      const next = toggleChecklistAt(body, lineIndex)
      return updateBody(next)
    },
    [save, updateBody],
  )

  const refreshPreview = useCallback(async () => {
    if (!save || !canEdit) return false
    setRefreshingPreview(true)
    try {
      const result = await repairThumbnail(save, { force: true })
      if (!result?.patch) return false
      return persist(result.patch)
    } finally {
      setRefreshingPreview(false)
    }
  }, [canEdit, persist, save])

  const removeSave = useCallback(async () => {
    if (!save || !canEdit) return false
    const supabase = createClient()
    const ok = await deleteSave(supabase, save.id)
    if (ok) router.push('/library')
    return ok
  }, [canEdit, router, save])

  const addReminder = useCallback(
    async (fireAt: Date, title?: string) => {
      if (!save) return false
      const id = `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const row: StoredSaveReminder = {
        id,
        saveId: save.id,
        title: title?.trim() || save.title,
        eventAt: fireAt.toISOString(),
        fireAt: fireAt.toISOString(),
        leadMinutes: 0,
      }
      upsertLocalReminder(row)
      setReminders(prev => [...prev.filter(r => r.id !== id), row])
      if (canEdit) {
        const supabase = createClient()
        if (!userIdRef.current) {
          const { data: { user } } = await supabase.auth.getUser()
          userIdRef.current = user?.id ?? null
        }
        if (userIdRef.current) {
          await upsertCloudReminder(supabase, userIdRef.current, row)
        }
      }
      return true
    },
    [canEdit, save],
  )

  const cancelReminder = useCallback(
    async (reminderId: string) => {
      removeLocalReminder(reminderId)
      setReminders(prev => prev.filter(r => r.id !== reminderId))
      if (canEdit) {
        const supabase = createClient()
        const row = reminders.find(r => r.id === reminderId)
        if (row && userIdRef.current) {
          await softDeleteCloudReminder(supabase, userIdRef.current, row)
        }
      }
      return true
    },
    [canEdit, reminders],
  )

  const findCollection = useCallback(
    (collectionId?: string | null): Collection | undefined => {
      if (!collectionId) return undefined
      return collections.find(c => c.id === collectionId)
    },
    [collections],
  )

  const updatePaperColor = useCallback(
    async (paperColor: string | null) => {
      if (!save) return false
      return persist({
        editor_style: { ...(save.editor_style ?? {}), paperColor },
      })
    },
    [persist, save],
  )

  return {
    save,
    collections,
    reminders,
    mode,
    importFileName,
    loading: sessionLoading || detailLoading,
    error: sessionError || detailError,
    saveStatus,
    canEdit,
    editingTitle,
    setEditingTitle,
    editingBody,
    setEditingBody,
    refreshingPreview,
    updateTitle,
    updateBody,
    moveToCollection,
    setTags,
    togglePin,
    toggleChecklistItem,
    refreshPreview,
    removeSave,
    addReminder,
    cancelReminder,
    findCollection,
    updatePaperColor,
    reminderPresets: () => reminderPresets(),
    formatReminder: formatCurrentReminder,
  }
}
