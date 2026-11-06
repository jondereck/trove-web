import type { StoredGuestImportDecision } from './guestImportPrompt'

const DIRTY_KEY = 'trove.dailyTasks.guestDirty.v1'
const OWNER_KEY = 'trove.dailyTasks.ownerUserId.v1'
const HOLD_KEY = 'trove.dailyTasks.guestHold.v1'
const DECISION_KEY = 'trove.guestImportDecision.v1'

type DecisionFile = Record<string, StoredGuestImportDecision>

function canStore(): boolean {
  return typeof window !== 'undefined'
}

export function markGuestDailyTasksDirty(): void {
  if (!canStore()) return
  try {
    localStorage.setItem(DIRTY_KEY, '1')
  } catch {
    // best effort
  }
}

export function clearGuestDailyTasksDirty(): void {
  if (!canStore()) return
  try {
    localStorage.removeItem(DIRTY_KEY)
  } catch {
    // best effort
  }
}

export function readGuestDailyTasksDirty(): boolean {
  if (!canStore()) return false
  try {
    return localStorage.getItem(DIRTY_KEY) === '1'
  } catch {
    return false
  }
}

export function readDailyTasksOwner(): string | null {
  if (!canStore()) return null
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

export function setDailyTasksOwner(userId: string | null): void {
  if (!canStore()) return
  try {
    if (!userId) localStorage.removeItem(OWNER_KEY)
    else localStorage.setItem(OWNER_KEY, userId)
  } catch {
    // best effort
  }
}

export function readGuestDailyHold(): string | null {
  if (!canStore()) return null
  try {
    return localStorage.getItem(HOLD_KEY)
  } catch {
    return null
  }
}

export function writeGuestDailyHold(json: string): void {
  if (!canStore()) return
  try {
    localStorage.setItem(HOLD_KEY, json)
  } catch {
    // best effort
  }
}

export function clearGuestDailyHold(): void {
  if (!canStore()) return
  try {
    localStorage.removeItem(HOLD_KEY)
  } catch {
    // best effort
  }
}

function readDecisionFile(): DecisionFile {
  if (!canStore()) return {}
  try {
    const raw = localStorage.getItem(DECISION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as DecisionFile
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readGuestImportDecision(userId: string): StoredGuestImportDecision | null {
  const row = readDecisionFile()[userId]
  if (!row || (row.choice !== 'import' && row.choice !== 'skip')) return null
  return row
}

export function writeGuestImportDecision(userId: string, decision: StoredGuestImportDecision): void {
  if (!canStore()) return
  const file = readDecisionFile()
  file[userId] = decision
  try {
    localStorage.setItem(DECISION_KEY, JSON.stringify(file))
  } catch {
    // best effort
  }
}
