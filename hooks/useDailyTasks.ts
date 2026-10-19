'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  addTask,
  completeReminderTask,
  completeTask,
  doneReminderIdsOnDay,
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
    // Hide anything already archived in Done Today (incl. rem-{id} recovery).
    const doneIds = doneReminderIdsOnDay(stateRef.current, new Date())
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
      stateRef.current = merged
      if (dailyTasksFingerprint(merged) !== dailyTasksFingerprint(before)) {
        setState(merged)
      }
      // Always re-filter reminders — Done Today from mobile may have landed.
      refreshReminders()
      setSyncStatus(isMeaningfulDailyTasksState(merged) ? 'synced' : 'empty-cloud')
    } catch {
      if (mountedRef.current) setSyncStatus('offline')
    }
  }, [refreshReminders])

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

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

    // Daily Tasks cloud first, then reminders — otherwise synthesize shows
    // today's weekly rows before Done Today from the phone is applied.
    void (async () => {
      const local = await readDailyTasks()
      if (cancelled || !mountedRef.current) return
      stateRef.current = local
      setState(local)
      setReady(true)
      refreshReminders()

      await pullCloud(true)
      if (cancelled || !mountedRef.current) return

      if (getSessionMode() === 'cloud') {
        const supabase = createClient()
        await ensureRemindersSynced(supabase, { force: true })
        invalidateUpcomingReminderIndex()
        if (mountedRef.current) refreshReminders()
      }
    })()

    const onFocus = () => {
      void (async () => {
        await pullCloud(true)
        if (getSessionMode() !== 'cloud') return
        const supabase = createClient()
        await ensureRemindersSynced(supabase, { force: true })
        invalidateUpcomingReminderIndex()
        if (mountedRef.current) refreshReminders()
      })()
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

  /** One local write + cloud push. Avoids mutate-then-rewrite (tick glimpse). */
  const applyLocal = useCallback(
    async (transform: (state: DailyTasksState) => DailyTasksState) => {
      const written = await mutateDailyTasks(transform)
      stateRef.current = written
      if (mountedRef.current) setState(written)
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
    },
    [],
  )

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      await applyLocal(s => ({ ...s, enabled }))
    },
    [applyLocal],
  )

  const add = useCallback(
    async (input: NewDailyTaskInput) => {
      await applyLocal(s => addTask({ ...s, enabled: true }, input))
    },
    [applyLocal],
  )

  const complete = useCallback(
    async (id: string) => {
      await applyLocal(s => completeTask(s, id))
    },
    [applyLocal],
  )

  const uncomplete = useCallback(
    async (id: string) => {
      await applyLocal(s => uncompleteTask(s, id))
    },
    [applyLocal],
  )

  const remove = useCallback(
    async (id: string) => {
      await applyLocal(s => removeTask(s, id))
    },
    [applyLocal],
  )

  const update = useCallback(
    async (id: string, patch: Partial<NewDailyTaskInput> & { title?: string }) => {
      await applyLocal(s => updateTask(s, id, patch))
    },
    [applyLocal],
  )

  const reschedule = useCallback(
    async (id: string, scheduledOn: string) => {
      await applyLocal(s => rescheduleTask(s, id, scheduledOn))
    },
    [applyLocal],
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
      await applyLocal(s =>
        completeReminderTask(s, {
          reminderId: row.id,
          title: reminderDisplayTitle(row),
          saveId: row.saveId,
          fireAt: row.fireAt,
          eventAt: row.eventAt,
        }),
      )
      refreshReminders()
    },
    [applyLocal, refreshReminders],
  )

  const updateSettings = useCallback(
    async (
      patch: Partial<
        Pick<DailyTasksState, 'enabled' | 'summaryEnabled' | 'summaryHour' | 'summaryMinute'>
      >,
    ) => {
      await applyLocal(s => ({ ...s, ...patch }))
    },
    [applyLocal],
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
