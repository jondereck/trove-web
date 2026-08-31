'use client'

import { useEffect, useState } from 'react'
import {
  getUpcomingReminderSaveIdSet,
  subscribeUpcomingReminderIndex,
} from './upcomingReminderIndex'

/** True when this save has at least one upcoming/active reminder. */
export function useHasUpcomingReminder(saveId: string, enabled = true): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled || !saveId) {
      setActive(false)
      return
    }
    let alive = true
    const refresh = () => {
      if (alive) setActive(getUpcomingReminderSaveIdSet().has(saveId))
    }
    refresh()
    return subscribeUpcomingReminderIndex(refresh)
  }, [saveId, enabled])

  return active
}
