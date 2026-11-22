import pg from 'pg'

type Bucket = { maxTs: string | null; count: number }

function bucket(row: Record<string, unknown> | undefined): Bucket {
  const count = Number(row?.count ?? 0)
  const raw = row?.max_ts
  let maxTs: string | null = null
  if (raw instanceof Date) maxTs = raw.toISOString()
  else if (typeof raw === 'string' && raw) maxTs = new Date(raw).toISOString()
  return { maxTs, count }
}

async function userIdFromRequest(pool: pg.Pool, request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : null
  if (!token) return null
  const result = await pool.query(
    'select app_user_id from public.app_sessions where token = $1 and expires_at > now()',
    [token],
  )
  return (result.rows[0]?.app_user_id as string | undefined) ?? null
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
    try {
      const userId = await userIdFromRequest(pool, request)
      if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

      const [saves, collections, dailyTasks] = await Promise.all([
        pool.query(
          `select count(*)::int as count,
                  max(greatest(
                    coalesce(updated_at, created_at),
                    coalesce(deleted_at, '-infinity'::timestamptz)
                  )) as max_ts
           from public.saves
           where user_id = $1::uuid and is_vault = false`,
          [userId],
        ),
        pool.query(
          `select count(*)::int as count,
                  max(coalesce(updated_at, created_at)) as max_ts
           from public.collections
           where user_id = $1::uuid`,
          [userId],
        ),
        pool.query(
          `select count(*)::int as count,
                  max(updated_at) as max_ts
           from public.daily_tasks
           where user_id = $1::uuid`,
          [userId],
        ),
      ])

      return Response.json({
        saves: bucket(saves.rows[0]),
        collections: bucket(collections.rows[0]),
        dailyTasks: bucket(dailyTasks.rows[0]),
      })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'syncwatch failed' },
        { status: 500 },
      )
    } finally {
      await pool.end().catch(() => {})
    }
  },
}
