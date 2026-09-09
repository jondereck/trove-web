import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

export type CloudDataChange = 'saves' | 'collections'

type Listener = (change: CloudDataChange) => void

const DEBOUNCE_MS = 450

const listeners = new Set<Listener>()
let channel: RealtimeChannel | null = null
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

/** Cross-device sync for Trove Web Library / Collections. */
export function startCloudRealtime(supabase: SupabaseClient, userId: string): void {
  if (!userId) {
    stopCloudRealtime(supabase)
    return
  }
  if (channel && activeUserId === userId) return

  stopCloudRealtime(supabase)
  activeUserId = userId
  channel = supabase
    .channel(`trove-web-sync:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'saves', filter: `user_id=eq.${userId}` },
      () => schedule('saves'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'collections', filter: `user_id=eq.${userId}` },
      () => schedule('collections'),
    )
    .subscribe()
}

export function stopCloudRealtime(supabase: SupabaseClient): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  pending = new Set()
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
  activeUserId = null
}
