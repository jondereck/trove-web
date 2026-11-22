export type SyncWatchBucket = {
  maxTs: string | null
  count: number
}

export type SyncWatchPayload = {
  saves: SyncWatchBucket
  collections: SyncWatchBucket
  dailyTasks: SyncWatchBucket
}

export type SqlRunner = (
  sql: string,
  params: unknown[],
) => Promise<{ rows: Array<Record<string, unknown>> }>

function bucketFromRow(row: Record<string, unknown> | undefined): SyncWatchBucket {
  const count = Number(row?.count ?? 0)
  const raw = row?.max_ts
  let maxTs: string | null = null
  if (raw instanceof Date) maxTs = raw.toISOString()
  else if (typeof raw === 'string' && raw) maxTs = new Date(raw).toISOString()
  return { maxTs, count }
}

/** Tiny watermarks for cross-device sync — no row payloads. */
export async function loadSyncWatch(
  query: SqlRunner,
  userId: string,
): Promise<SyncWatchPayload> {
  const [saves, collections, dailyTasks] = await Promise.all([
    query(
      `select count(*)::int as count,
              max(greatest(
                coalesce(updated_at, created_at),
                coalesce(deleted_at, '-infinity'::timestamptz)
              )) as max_ts
       from public.saves
       where user_id = $1::uuid and is_vault = false`,
      [userId],
    ),
    query(
      `select count(*)::int as count,
              max(coalesce(updated_at, created_at)) as max_ts
       from public.collections
       where user_id = $1::uuid`,
      [userId],
    ),
    query(
      `select count(*)::int as count,
              max(updated_at) as max_ts
       from public.daily_tasks
       where user_id = $1::uuid`,
      [userId],
    ),
  ])

  return {
    saves: bucketFromRow(saves.rows[0]),
    collections: bucketFromRow(collections.rows[0]),
    dailyTasks: bucketFromRow(dailyTasks.rows[0]),
  }
}

export function syncWatchChanged(
  previous: SyncWatchPayload | null,
  next: SyncWatchPayload,
): Array<'saves' | 'collections' | 'dailyTasks'> {
  if (!previous) return ['saves', 'collections', 'dailyTasks']
  const changed: Array<'saves' | 'collections' | 'dailyTasks'> = []
  if (
    previous.saves.maxTs !== next.saves.maxTs ||
    previous.saves.count !== next.saves.count
  ) {
    changed.push('saves')
  }
  if (
    previous.collections.maxTs !== next.collections.maxTs ||
    previous.collections.count !== next.collections.count
  ) {
    changed.push('collections')
  }
  if (
    previous.dailyTasks.maxTs !== next.dailyTasks.maxTs ||
    previous.dailyTasks.count !== next.dailyTasks.count
  ) {
    changed.push('dailyTasks')
  }
  return changed
}
