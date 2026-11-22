import type { SupabaseClient } from '@supabase/supabase-js'
import { createRealtimeClient } from '@neon/realtime/client'
import {
  syncWatchChanged,
  type SyncWatchPayload,
} from '@/lib/neon/syncWatch'

export type CloudDataChange = 'saves' | 'collections' | 'dailyTasks'

type Listener = (change: CloudDataChange) => void

const DEBOUNCE_MS = 450
const POLL_MS = 12_000
const SYNC_MODE = (process.env.NEXT_PUBLIC_SYNC_MODE ?? 'watch').toLowerCase()

const listeners = new Set<Listener>()
let activeUserId: string | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pending = new Set<CloudDataChange>()
let pollTimer: ReturnType<typeof setInterval> | null = null
let lastWatch: SyncWatchPayload | null = null
let supabaseRef: SupabaseClient | null = null
let seeded = false
let realtimeStops: Array<() => void> = []
let renewTimer: ReturnType<typeof setInterval> | null = null

function flush() {
  debounceTimer = null
  const batch = pending
  pending = new Set()
  for (const change of batch) {
    listeners.forEach((listener) => listener(change))
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

function stopRealtimeSubs() {
  for (const stop of realtimeStops) stop()
  realtimeStops = []
  if (renewTimer) {
    clearInterval(renewTimer)
    renewTimer = null
  }
}

async function pollSyncWatchSafe(): Promise<void> {
  try {
    if (!activeUserId || !supabaseRef) return
    const { data } = await supabaseRef.auth.getSession()
    const token = data.session?.access_token
    if (!token) return
    const response = await fetch('/api/sync-watch', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return
    const next = (await response.json()) as SyncWatchPayload
    const previous = lastWatch
    lastWatch = next
    if (!seeded) {
      seeded = true
      return
    }
    for (const change of syncWatchChanged(previous, next)) {
      schedule(change)
    }
  } catch {
    // Keep polling; a single failure must not stop cross-device sync.
  }
}

function startWatchPolling() {
  if (!activeUserId || pollTimer) return
  void pollSyncWatchSafe()
  pollTimer = setInterval(() => {
    void pollSyncWatchSafe()
  }, POLL_MS)
}

type SealedBundle = {
  url: string
  saves: unknown
  collections: unknown
  dailyTasks: unknown
}

async function fetchSealed(): Promise<SealedBundle | null> {
  if (!supabaseRef) return null
  const { data } = await supabaseRef.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null
  const response = await fetch('/api/realtime/seal', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  return (await response.json()) as SealedBundle
}

async function startRealtimeSubs(): Promise<void> {
  stopRealtimeSubs()
  const sealed = await fetchSealed()
  if (!sealed?.url) {
    startWatchPolling()
    return
  }
  const client = createRealtimeClient({ url: sealed.url })
  const buckets: Array<{ key: CloudDataChange; query: unknown }> = [
    { key: 'saves', query: sealed.saves },
    { key: 'collections', query: sealed.collections },
    { key: 'dailyTasks', query: sealed.dailyTasks },
  ]
  for (const bucket of buckets) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = client.subscribe(bucket.query as any)
    const onChange = () => schedule(bucket.key)
    sub.onChange?.(onChange)
    // Some SDK versions use event emitter style
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sub as any).on?.('change', onChange)
    realtimeStops.push(() => {
      try {
        sub.unsubscribe?.()
      } catch {
        /* ignore */
      }
    })
  }
  // Sealed queries expire ~60s — renew subscriptions.
  renewTimer = setInterval(() => {
    void startRealtimeSubs()
  }, 45_000)
}

/** Cross-device sync: Neon Realtime when configured, else sync-watch watermarks. */
export function startCloudRealtime(supabase: SupabaseClient, userId: string): void {
  if (!userId) {
    stopCloudRealtime(supabase)
    return
  }
  if ((pollTimer || realtimeStops.length) && activeUserId === userId) return
  stopCloudRealtime(supabase)
  activeUserId = userId
  supabaseRef = supabase
  seeded = false
  lastWatch = null
  if (SYNC_MODE === 'realtime') {
    void startRealtimeSubs()
  } else {
    startWatchPolling()
  }
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
  stopRealtimeSubs()
  pending = new Set()
  activeUserId = null
  supabaseRef = null
  lastWatch = null
  seeded = false
}
