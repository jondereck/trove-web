import type { SupabaseClient } from '@supabase/supabase-js'

export type CloudDataChange = 'saves' | 'collections' | 'dailyTasks'

type Listener = (change: CloudDataChange) => void

const DEBOUNCE_MS = 450

const listeners = new Set<Listener>()
let activeUserId: string | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pending = new Set<CloudDataChange>()

function flush() {
  debounceTimer = null
  const batch = pending
  pending = new Set()
  for (const change of batch) {
    listeners.forEach(listener => listener(change))
  }
}

function schedule(change: CloudDataChange) {
  pending.add(change)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flush, DEBOUNCE_MS)
}

export function subscribeCloudDataChanges(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const POLL_MS = 12000
let pollTimer: ReturnType<typeof setInterval> | null = null

/** Cross-device sync. Neon is polled; the Supabase argument is unused. */
export function startCloudRealtime(_supabase: SupabaseClient, userId: string): void {
  if (!userId) {
    stopCloudRealtime(_supabase)
    return
  }
  if (pollTimer && activeUserId === userId) return
  stopCloudRealtime(_supabase)
  activeUserId = userId
  pollTimer = setInterval(() => {
    schedule('saves')
    schedule('collections')
    schedule('dailyTasks')
  }, POLL_MS)
}

export function stopCloudRealtime(_supabase: SupabaseClient): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  pending = new Set()
  activeUserId = null
}
