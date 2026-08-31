'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ensureRemindersSynced, resetReminderSync } from '@/lib/reminderSession'
import type { SessionMode } from '@/lib/sessionMode'
import { rescheduleWebReminders } from '@/lib/webReminderNotifications'
import { hydrateSaveReminderStore } from '@/lib/saveRemindersCore'
import { loadReminderStore } from '@/lib/reminderStore'
import { invalidateUpcomingReminderIndex } from '@/lib/upcomingReminderIndex'

type Props = {
  mode: SessionMode
}

export default function ReminderSync({ mode }: Props) {
  useEffect(() => {
    if (mode === 'cloud') {
      const supabase = createClient()
      void ensureRemindersSynced(supabase)
      return () => {
        resetReminderSync()
      }
    }

    const store = hydrateSaveReminderStore(loadReminderStore())
    rescheduleWebReminders(store)
    invalidateUpcomingReminderIndex()
  }, [mode])

  return null
}
