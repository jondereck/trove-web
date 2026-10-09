'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  addTask,
  completedOnDay,
  completeReminderTask,
  completeTask,
  emptyDailyTasksState,
  removeTask,
  rescheduleTask,
  uncompleteTask,
  updateTask,
  type DailyTasksState,
  type NewDailyTaskInput,
} from '@/lib/dailyTasks'
import { dailyTasksFingerprint, isMeaningfulDailyTasksState } from '@/lib/dailyTasksCloudSync'
import {
  invalidateDailyTasksCloudSync,
  mutateDailyTasks,
  pushDailyTasksCloud,
  readDailyTasks,
  subscribeDailyTasks,
  syncDailyTasksCloud,
  writeDailyTasks,
} from '@/lib/dailyTasksStore'
import { remindersForTodayList } from '@/lib/dailyTasksReminders'
import {
  hydrateSaveReminderStore,
  markReminderDoneForTodayInStore,
  markReminderFiredInStore,
  reminderDisplayTitle,
  type StoredSaveReminder,
} from '@/lib/saveRemindersCore'
import { loadReminderStore, saveReminderStore } from '@/lib/reminderStore'
import {
  invalidateUpcomingReminderIndex,
  subscribeUpcomingReminderIndex,
} from '@/lib/upcomingReminderIndex'
import { getSessionMode } from '@/lib/sessionMode'
import { subscribeCloudDataChanges } from '@/lib/cloudRealtime'
import { ensureRemindersSynced } from '@/lib/reminderSession'

export type TodayReminderRow = StoredSaveReminder & { displayTitle: string }

export type DailyTasksSyncStatus = 'idle' | 'syncing' | 'synced' | 'empty-cloud' | 'offline'

export function useDailyTasks() {
  // Always start empty so SSR HTML matches the first client paint.
  const [state, setState] = useState<DailyTasksState>(emptyDailyTasksState)
  const [dayReminders, setDayReminders] = useState<TodayReminderRow[]>([])
  const [ready, setReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<DailyTasksSyncStatus>('idle')
  const mountedRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const refreshReminders = useCallback(() => {
    if (typeof window === 'undefined') return
    const store = hydrateSaveReminderStore(loadReminderStore())
    // Match mobile Today: active/overdue + fired-today until ticked in Done Today.
    const rows = remindersForTodayList(
      Object.values(store.upcoming),
      store.history,
    )
    // Match mobile TodayScreen: only hide reminders archived in Done Today (this local day).
    const now = new Date()
    const doneIds = new Set(
      completedOnDay(stateRef.current, now)
        .filter(e => e.source === 'reminder' && e.reminderId)
        .map(e => e.reminderId!),
    )
    if (!mountedRef.current) return
    setDayReminders(
      rows
        .filter(row => !doneIds.has(row.id))
        .map(row => ({
          ...row,
          displayTitle: reminderDisplayTitle(row),
        })),
    )
  }, [])

  const pullCloud = useCallback(async (force = false) => {
    if (typeof window === 'undefined') return
    if (getSessionMode() !== 'cloud') {
      if (mountedRef.current) setSyncStatus('offline')
      return
    }
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) {
      if (mountedRef.current) setSyncStatus('offline')
      return
    }
    if (mountedRef.current) setSyncStatus('syncing')
    if (force) invalidateDailyTasksCloudSync()
    try {
      const before = stateRef.current
      const merged = await syncDailyTasksCloud(supabase, userId, { force })
      if (!mountedRef.current) return
      if (dailyTasksFingerprint(merged) !== dailyTasksFingerprint(before)) {
        setState(merged)
      }
      setSyncStatus(isMeaningfulDailyTasksState(merged) ? 'synced' : 'empty-cloud')
    } catch {
      if (mountedRef.current) setSyncStatus('offline')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    void readDailyTasks().then(next => {
      if (cancelled || !mountedRef.current) return
      setState(next)
      setReady(true)
    })
    refreshReminders()

    const unsub = subscribeDailyTasks(next => {
      if (!mountedRef.current) return
      setState(next)
      stateRef.current = next
      refreshReminders()
    })
    const unsubReminders = subscribeUpcomingReminderIndex(() => {
      if (!mountedRef.current) return
      refreshReminders()
    })

    void pullCloud(true)

    // Pull cloud reminders so "Reminders today" matches mobile (local store alone is empty on web).
    if (getSessionMode() === 'cloud') {
      const supabase = createClient()
      void ensureRemindersSynced(supabase).then(() => {
        invalidateUpcomingReminderIndex()
        if (mountedRef.current) refreshReminders()
      })
    }

    const onFocus = () => {
      void pullCloud(true)
      if (getSessionMode() === 'cloud') {
        const supabase = createClient()
        void ensureRemindersSynced(supabase).then(() => {
          invalidateUpcomingReminderIndex()
          if (mountedRef.current) refreshReminders()
        })
      }
    }
    window.addEventListener('focus', onFocus)

    const unsubRealtime = subscribeCloudDataChanges(change => {
      if (change !== 'dailyTasks') return
      void pullCloud(true)
    })

    return () => {
      cancelled = true
      mountedRef.current = false
      unsub()
      unsubReminders()
      unsubRealtime()
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshReminders, pullCloud])

  const persist = useCallback(async (next: DailyTasksState) => {
    const written = await writeDailyTasks(next)
    if (getSessionMode() === 'cloud') {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      const userId = data.user?.id
      if (userId) {
        void pushDailyTasksCloud(supabase, userId, written).then(() => {
          if (mountedRef.current) setSyncStatus('synced')
        })
      }
    }
    return written
  }, [])

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      await mutateDailyTasks(s => ({ ...s, enabled }))
      await persist(await readDailyTasks())
    },
    [persist],
  )

  const add = useCallback(
    async (input: NewDailyTaskInput) => {
      await mutateDailyTasks(s => addTask({ ...s, enabled: true }, input))
      await persist(await readDailyTasks())
    },
    [persist],
  )

  const complete = useCallback(
    async (id: string) => {
      await mutateDailyTasks(s => completeTask(s, id))
      await persist(await readDailyTasks())
    },
    [persist],
  )

  const uncomplete = useCallback(
    async (id: string) => {
      await mutateDailyTasks(s => uncompleteTask(s, id))
      await persist(await readDailyTasks())
    },
    [persist],
  )

  const remove = useCallback(
    async (id: string) => {
      await mutateDailyTasks(s => removeTask(s, id))
      await persist(await readDailyTasks())
    },
    [persist],
  )

  const update = useCallback(
    async (id: string, patch: Partial<NewDailyTaskInput> & { title?: string }) => {
      await mutateDailyTasks(s => updateTask(s, id, patch))
      await persist(await readDailyTasks())
    },
    [persist],
  )

  const reschedule = useCallback(
    async (id: string, scheduledOn: string) => {
      await mutateDailyTasks(s => rescheduleTask(s, id, scheduledOn))
      await persist(await readDailyTasks())
    },
    [persist],
  )

  const completeReminder = useCallback(
    async (row: StoredSaveReminder) => {
      const store = hydrateSaveReminderStore(loadReminderStore())
      const live = store.upcoming[row.id]
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)
      // Match mobile: finish today + move recurring to the next date.
      // If cloud already advanced fireAt past today, leave upcoming as-is.
      const nextStore =
        live && Date.parse(live.fireAt) <= endOfToday.getTime()
          ? markReminderDoneForTodayInStore(store, row.id)
          : live
            ? store
            : markReminderFiredInStore(store, row.id, row.fireAt || new Date().toISOString())
      saveReminderStore(nextStore)
      invalidateUpcomingReminderIndex()
      const written = await mutateDailyTasks(s =>
        completeReminderTask(s, {
          reminderId: row.id,
          title: reminderDisplayTitle(row),
          saveId: row.saveId,
          fireAt: row.fireAt,
          eventAt: row.eventAt,
        }),
      )
      stateRef.current = written
      await persist(written)
      refreshReminders()
    },
    [persist, refreshReminders],
  )

  const updateSettings = useCallback(
    async (
      patch: Partial<
        Pick<DailyTasksState, 'enabled' | 'summaryEnabled' | 'summaryHour' | 'summaryMinute'>
      >,
    ) => {
      await mutateDailyTasks(s => ({ ...s, ...patch }))
      await persist(await readDailyTasks())
    },
    [persist],
  )

  return {
    state,
    ready,
    dayReminders,
    syncStatus,
    refreshCloud: () => pullCloud(true),
    setEnabled,
    add,
    complete,
    uncomplete,
    remove,
    update,
    reschedule,
    completeReminder,
    updateSettings,
    refreshReminders,
  }
}
