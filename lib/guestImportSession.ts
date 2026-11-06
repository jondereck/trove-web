import { createClient } from '@/lib/supabase/client'
import { fetchCloudDailyTasks, syncDailyTasksWithCloud } from './dailyTasksDb'
import {
  dailyTasksFingerprint,
  isMeaningfulDailyTasksState,
  mergeDailyTasksState,
} from './dailyTasksCloudSync'
import { emptyDailyTasksState, normalizeDailyTasksState, type DailyTasksState } from './dailyTasks'
import {
  invalidateDailyTasksCloudSync,
  peekDailyTasks,
  syncDailyTasksCloud,
  writeDailyTasks,
} from './dailyTasksStore'
import {
  beginGuestUploadBypass,
  endGuestUploadBypass,
  forgetGuestImportUser,
  guestDailyPushHeld,
  guestSessionUserId,
  markGuestImportResolved,
  setGuestSessionUserId,
} from './guestImportGate'
import {
  clearGuestDailyHold,
  clearGuestDailyTasksDirty,
  markGuestDailyTasksDirty,
  readDailyTasksOwner,
  readGuestDailyHold,
  readGuestDailyTasksDirty,
  readGuestImportDecision,
  setDailyTasksOwner,
  writeGuestDailyHold,
  writeGuestImportDecision,
} from './guestImportOrigin'
import {
  dailyTasksWouldUpload,
  guestImportAction,
  guestImportPercent,
  type GuestImportFacts,
} from './guestImportPrompt'

export type GuestImportProgress = {
  completed: number
  total: number
  percent: number
}

type PromptListener = (facts: GuestImportFacts) => void
const promptListeners = new Set<PromptListener>()
let currentPrompt: GuestImportFacts | null = null
let inflight: Promise<void> | null = null

export function currentGuestImportPrompt(): GuestImportFacts | null {
  return currentPrompt
}

export function subscribeGuestImportPrompt(listener: PromptListener): () => void {
  promptListeners.add(listener)
  return () => {
    promptListeners.delete(listener)
  }
}

function emitPrompt(facts: GuestImportFacts): void {
  currentPrompt = facts
  promptListeners.forEach(listener => listener(facts))
}

export function clearGuestImportPrompt(): void {
  currentPrompt = null
}

function buildFacts(userId: string, local: DailyTasksState, remote: DailyTasksState | null): GuestImportFacts {
  const remoteMeaningful = !!remote && isMeaningfulDailyTasksState(remote)
  const merged = remote ? mergeDailyTasksState(local, remote) : null
  return {
    canUploadToCloud: true,
    saveCount: 0,
    collectionCount: 0,
    dailyWouldUpload: dailyTasksWouldUpload({
      guestDirty: readGuestDailyTasksDirty(),
      ownerUserId: readDailyTasksOwner(),
      userId,
      localMeaningful: isMeaningfulDailyTasksState(local),
      remoteExists: remoteMeaningful,
      mergedDiffersFromRemote: !!merged && !!remote
        && dailyTasksFingerprint(merged) !== dailyTasksFingerprint(remote),
    }),
    dailyFingerprint: dailyTasksFingerprint(local),
    stored: readGuestImportDecision(userId),
  }
}

function stashGuestDailyTasks(local: DailyTasksState): void {
  if (!isMeaningfulDailyTasksState(local)) return
  if (!readGuestDailyTasksDirty() && readGuestDailyHold()) return
  writeGuestDailyHold(JSON.stringify(local))
}

async function run(userId: string): Promise<void> {
  if (currentPrompt && guestDailyPushHeld()) return
  setGuestSessionUserId(userId)
  const local = peekDailyTasks()
  const supabase = createClient()
  const remote = await fetchCloudDailyTasks(supabase, userId)
  const facts = buildFacts(userId, local, remote)
  const action = guestImportAction(facts)
  switch (action) {
    case 'prompt':
      emitPrompt(facts)
      return
    case 'withhold':
      if (facts.dailyWouldUpload) {
        stashGuestDailyTasks(local)
        const next = remote && isMeaningfulDailyTasksState(remote) ? remote : emptyDailyTasksState()
        await writeDailyTasks(next)
        setDailyTasksOwner(userId)
        clearGuestDailyTasksDirty()
      }
      markGuestImportResolved(userId)
      return
    case 'sync':
      setDailyTasksOwner(userId)
      clearGuestDailyTasksDirty()
      markGuestImportResolved(userId)
      invalidateDailyTasksCloudSync()
      await syncDailyTasksCloud(supabase, userId, { force: true }).catch(() => {})
      return
    default: {
      const _never: never = action
      return _never
    }
  }
}

export function ensureWebGuestImport(userId: string): Promise<void> {
  if (inflight) return inflight
  inflight = run(userId).finally(() => {
    inflight = null
  })
  return inflight
}

export async function importWebGuestDailyTasks(
  onProgress: (progress: GuestImportProgress) => void,
): Promise<void> {
  const userId = guestSessionUserId()
  if (!userId) throw new Error('Sign in before importing daily tasks.')
  const local = peekDailyTasks()
  const total = 1
  onProgress({ completed: 0, total, percent: guestImportPercent(0, total) })
  beginGuestUploadBypass()
  try {
    const supabase = createClient()
    const merged = await syncDailyTasksWithCloud(supabase, userId, local)
    await writeDailyTasks(merged)
    clearGuestDailyHold()
    clearGuestDailyTasksDirty()
    setDailyTasksOwner(userId)
    writeGuestImportDecision(userId, {
      choice: 'import',
      saveCount: 0,
      collectionCount: 0,
      dailyFingerprint: dailyTasksFingerprint(local),
    })
    clearGuestImportPrompt()
    markGuestImportResolved(userId)
    onProgress({ completed: 1, total, percent: guestImportPercent(1, total) })
  } finally {
    endGuestUploadBypass()
  }
}

export async function declineWebGuestImport(): Promise<void> {
  const userId = guestSessionUserId()
  if (!userId) return
  const local = peekDailyTasks()
  const supabase = createClient()
  const remote = await fetchCloudDailyTasks(supabase, userId)
  const facts = buildFacts(userId, local, remote)
  if (facts.dailyWouldUpload) {
    stashGuestDailyTasks(local)
    const next = remote && isMeaningfulDailyTasksState(remote) ? remote : emptyDailyTasksState()
    await writeDailyTasks(next)
    setDailyTasksOwner(userId)
    clearGuestDailyTasksDirty()
  }
  writeGuestImportDecision(userId, {
    choice: 'skip',
    saveCount: 0,
    collectionCount: 0,
    dailyFingerprint: facts.dailyFingerprint,
  })
  clearGuestImportPrompt()
  markGuestImportResolved(userId)
}

export function restoreWebGuestDailyTasks(): void {
  const userId = guestSessionUserId()
  if (userId) forgetGuestImportUser(userId)
  setGuestSessionUserId(null)
  const raw = readGuestDailyHold()
  if (!raw) return
  try {
    const parsed = normalizeDailyTasksState(JSON.parse(raw))
    void writeDailyTasks(parsed).then(() => markGuestDailyTasksDirty())
  } catch {
    markGuestDailyTasksDirty()
  }
}
