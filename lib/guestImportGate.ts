import { isMeaningfulDailyTasksState, normalizeDailyTasksState } from './dailyTasks'

const DAILY_KEY = 'trove.dailyTasks.v1'
const DIRTY_KEY = 'trove.dailyTasks.guestDirty.v1'
const OWNER_KEY = 'trove.dailyTasks.ownerUserId.v1'

const resolved = new Set<string>()
let held = false
let bypass = false
let cachedUserId: string | null | undefined

export function setGuestSessionUserId(id: string | null): void {
  cachedUserId = id
}

export function guestSessionUserId(): string | null | undefined {
  return cachedUserId
}

export function holdGuestDailyPushFor(userId: string): void {
  if (!userId || resolved.has(userId)) return
  held = true
}

export function holdGuestDailyPush(): void {
  held = true
}

export function guestDailyPushHeld(): boolean {
  return held && !bypass
}

export function beginGuestUploadBypass(): void {
  bypass = true
}

export function endGuestUploadBypass(): void {
  bypass = false
}

export function markGuestImportResolved(userId: string): void {
  if (userId) resolved.add(userId)
  held = false
}

export function forgetGuestImportUser(userId: string): void {
  resolved.delete(userId)
}

export function releaseGuestDailyPush(): void {
  held = false
}

function bootGuestImportHold(): void {
  if (typeof window === 'undefined') return
  try {
    const dirty = localStorage.getItem(DIRTY_KEY) === '1'
    const owner = localStorage.getItem(OWNER_KEY)
    if (!dirty && owner) return
    const raw = localStorage.getItem(DAILY_KEY)
    if (!raw) {
      if (dirty) holdGuestDailyPush()
      return
    }
    const state = normalizeDailyTasksState(JSON.parse(raw))
    if (dirty || (!owner && isMeaningfulDailyTasksState(state))) holdGuestDailyPush()
  } catch {
    // ignore unreadable local tasks
  }
}

bootGuestImportHold()
