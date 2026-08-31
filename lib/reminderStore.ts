import type { SaveReminderStore, StoredSaveReminder } from './saveRemindersCore'

const STORE_KEY = 'trove-web:reminder-store'

export function emptyReminderStore(): SaveReminderStore {
  return { upcoming: {}, history: [] }
}

export function loadReminderStore(): SaveReminderStore {
  if (typeof window === 'undefined') return emptyReminderStore()
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return emptyReminderStore()
    const parsed = JSON.parse(raw) as SaveReminderStore
    return {
      upcoming: parsed.upcoming ?? {},
      history: parsed.history ?? [],
      historyClearedAt: parsed.historyClearedAt ?? null,
    }
  } catch {
    return emptyReminderStore()
  }
}

export function saveReminderStore(store: SaveReminderStore): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export function remindersForSave(
  store: SaveReminderStore,
  saveId: string,
): StoredSaveReminder[] {
  return Object.values(store.upcoming).filter(
    row => row.saveId === saveId && !row.deletedAt && !row.firedAt,
  )
}

export function upsertLocalReminder(row: StoredSaveReminder): SaveReminderStore {
  const store = loadReminderStore()
  store.upcoming[row.id] = {
    ...row,
    updatedAt: new Date().toISOString(),
  }
  saveReminderStore(store)
  return store
}

export function removeLocalReminder(reminderId: string): SaveReminderStore {
  const store = loadReminderStore()
  delete store.upcoming[reminderId]
  saveReminderStore(store)
  return store
}
