import pg from 'pg'

const TABLES = [
  { name: 'profiles', pk: 'id' },
  { name: 'collections', pk: 'id' },
  { name: 'saves', pk: 'id' },
  { name: 'vault_meta', pk: 'user_id' },
  { name: 'save_reminders', pk: 'id' },
  { name: 'collection_shares', pk: 'id' },
  { name: 'collection_share_members', pk: 'id' },
  { name: 'daily_tasks', pk: 'user_id' },
  { name: 'trove_mcp_tokens', pk: 'id' },
] as const

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  const header = request.headers.get('authorization') ?? ''
  // Neon Triggers may omit Authorization; allow CRON_SECRET match or Trigger-UA.
  if (secret && header === `Bearer ${secret}`) return true
  if (request.headers.get('x-neon-trigger') === '1') return true
  if (!secret && request.headers.get('user-agent')?.includes('Neon')) return true
  return false
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
    if (!authorized(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      ''
    ).replace(/\/$/, '')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase backup target is not configured' }, { status: 500 })
    }

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
    const counts: Record<string, number> = {}
    try {
      for (const table of TABLES) {
        const result = await pool.query(`select * from public.${table.name}`)
        counts[table.name] = result.rowCount ?? result.rows.length
        if (result.rows.length === 0) continue
        const response = await fetch(
          `${supabaseUrl}/rest/v1/${table.name}?on_conflict=${table.pk}`,
          {
            method: 'POST',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify(result.rows),
          },
        )
        if (!response.ok) {
          throw new Error(`${table.name} backup failed: ${response.status}`)
        }
      }
      return Response.json({ ok: true, counts })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    } finally {
      await pool.end().catch(() => {})
    }
  },
}
