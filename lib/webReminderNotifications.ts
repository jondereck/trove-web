import {
  buildSaveReminderContent,
  hydrateSaveReminderStore,
  type SaveReminderStore,
  type StoredSaveReminder,
} from './saveRemindersCore'
import { loadReminderStore } from './reminderStore'
import { invalidateUpcomingReminderIndex } from './upcomingReminderIndex'

const timers = new Map<string, number>()

function presentedKey(row: StoredSaveReminder): string {
  return `trove.rem.presented:${row.id}:${row.fireAt}`
}

function wasPresented(row: StoredSaveReminder): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(presentedKey(row)) === '1'
  } catch {
    return false
  }
}

function markPresented(row: StoredSaveReminder): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(presentedKey(row), '1')
  } catch {
    // ignore quota / private mode
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

function clearScheduledTimers(): void {
  for (const id of timers.keys()) {
    window.clearTimeout(timers.get(id)!)
    timers.delete(id)
  }
}

function scheduleReminder(row: StoredSaveReminder): void {
  const fireMs = Date.parse(row.fireAt)
  if (!Number.isFinite(fireMs)) return
  const delay = fireMs - Date.now()
  if (delay <= 0) {
    // Past fire: notify once if needed, but keep upcoming until Daily tick (mobile parity).
    if (!wasPresented(row)) void fireWebReminder(row)
    return
  }
  const timer = window.setTimeout(() => {
    timers.delete(row.id)
    void fireWebReminder(row)
  }, Math.min(delay, 2_147_483_647))
  timers.set(row.id, timer)
}

/**
 * Show the browser notification only. Do NOT archive / advance the reminder —
 * that happens when the user ticks Daily Tasks (mobile parity).
 */
async function fireWebReminder(row: StoredSaveReminder): Promise<void> {
  const store = hydrateSaveReminderStore(loadReminderStore())
  const current = store.upcoming[row.id]
  if (!current || current.deletedAt) return
  if (wasPresented(current)) return

  const content = buildSaveReminderContent({
    saveId: current.saveId,
    title: current.title,
    fireAt: current.fireAt,
  })

  if (notificationsSupported() && Notification.permission === 'granted') {
    const notification = new Notification(content.title, {
      body: content.body,
      icon: '/trove-app-icon.png',
      tag: `${row.id}:${current.fireAt}`,
      data: content.data,
    })
    notification.onclick = () => {
      window.focus()
      window.location.assign(`/library/${current.saveId}`)
      notification.close()
    }
  }

  markPresented(current)
  invalidateUpcomingReminderIndex()
}

export function rescheduleWebReminders(
  store: SaveReminderStore = hydrateSaveReminderStore(loadReminderStore()),
): void {
  if (typeof window === 'undefined') return
  clearScheduledTimers()
  if (!notificationsSupported() || Notification.permission !== 'granted') return

  for (const row of Object.values(store.upcoming)) {
    if (row.deletedAt || row.firedAt) continue
    scheduleReminder(row)
  }
}

export function cancelWebReminder(reminderId: string): void {
  const timer = timers.get(reminderId)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timers.delete(reminderId)
  }
}
