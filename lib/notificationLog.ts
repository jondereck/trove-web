import {
  mergeNotificationEntries,
  type NotificationLogEntry,
} from './notificationLogCore'

const STORAGE_KEY = 'trove-web:notification-log'

const listeners = new Set<() => void>()

function notifyListeners(): void {
  listeners.forEach(listener => listener())
}

function readStored(): NotificationLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as NotificationLogEntry[]) : []
  } catch {
    return []
  }
}

function writeStored(entries: NotificationLogEntry[]): NotificationLogEntry[] {
  if (typeof window === 'undefined') return entries
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  notifyListeners()
  return entries
}

export function getNotificationLog(): NotificationLogEntry[] {
  return readStored()
}

export function recordNotificationEntry(entry: NotificationLogEntry): NotificationLogEntry[] {
  return writeStored(mergeNotificationEntries(readStored(), [entry]))
}

export function clearNotificationLog(): NotificationLogEntry[] {
  return writeStored([])
}

export function syncPresentedNotifications(): Promise<NotificationLogEntry[]> {
  return Promise.resolve(getNotificationLog())
}

export function markAllNotificationsRead(): NotificationLogEntry[] {
  return writeStored(readStored().map(entry => ({ ...entry, read: true })))
}

export function getUnreadNotificationCount(): number {
  return readStored().filter(entry => !entry.read).length
}

export function subscribeNotificationLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
