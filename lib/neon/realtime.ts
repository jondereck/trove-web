import { createRealtime, rawSql } from '@neon/realtime/server'

export type SyncWatchRow = { count: number; max_ts: string | null }

let realtime: ReturnType<typeof createRealtime> | null = null

export function neonRealtime() {
  const secret = process.env.NEON_REALTIME_SECRET
  if (!secret) throw new Error('NEON_REALTIME_SECRET not configured')
  if (!realtime) {
    realtime = createRealtime({
      secret,
      db: process.env.NEON_REALTIME_DB ?? 'neondb',
    })
  }
  return realtime
}

export function savesWatchQuery(userId: string) {
  return rawSql<SyncWatchRow>(
    `select count(*)::int as count,
            max(greatest(
              coalesce(updated_at, created_at),
              coalesce(deleted_at, '-infinity'::timestamptz)
            )) as max_ts
     from public.saves
     where user_id = $1::uuid and is_vault = false`,
    [userId],
  )
}

export function collectionsWatchQuery(userId: string) {
  return rawSql<SyncWatchRow>(
    `select count(*)::int as count,
            max(coalesce(updated_at, created_at)) as max_ts
     from public.collections
     where user_id = $1::uuid`,
    [userId],
  )
}

export function dailyTasksWatchQuery(userId: string) {
  return rawSql<SyncWatchRow>(
    `select count(*)::int as count,
            max(updated_at) as max_ts
     from public.daily_tasks
     where user_id = $1::uuid`,
    [userId],
  )
}

export async function sealSyncWatchQueries(userId: string) {
  const rt = neonRealtime()
  const [saves, collections, dailyTasks] = await Promise.all([
    rt.seal({ query: savesWatchQuery(userId) }),
    rt.seal({ query: collectionsWatchQuery(userId) }),
    rt.seal({ query: dailyTasksWatchQuery(userId) }),
  ])
  return { saves, collections, dailyTasks }
}
