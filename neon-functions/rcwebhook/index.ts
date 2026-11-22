import pg from 'pg'

const ENTITLEMENT_CLOUD = 'cloud'
const ENTITLEMENT_UNLOCKED = 'unlocked'

type Tier = 'free' | 'unlocked' | 'cloud'
type RevenueCatEntitlement = { expires_date?: string | null }

async function fetchTier(appUserId: string, apiKey: string): Promise<Tier> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  )
  if (!res.ok) throw new Error(`RevenueCat API ${res.status}`)
  const data = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, RevenueCatEntitlement> }
  }
  const entitlements = data?.subscriber?.entitlements ?? {}
  const now = Date.now()
  const isActive = (key: string) => {
    const ent = entitlements[key]
    if (!ent) return false
    return !ent.expires_date || new Date(ent.expires_date).getTime() > now
  }
  if (isActive(ENTITLEMENT_CLOUD)) return 'cloud'
  if (isActive(ENTITLEMENT_UNLOCKED)) return 'unlocked'
  return 'free'
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'POST only' }, { status: 405 })
    }
    const secret = process.env.RC_WEBHOOK_SECRET ?? ''
    if (!secret || request.headers.get('authorization') !== secret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const apiKey = process.env.RC_API_KEY ?? ''
    if (!apiKey || !process.env.DATABASE_URL) {
      return Response.json({ error: 'Webhook secrets not configured' }, { status: 500 })
    }

    try {
      const body = (await request.json().catch(() => null)) as {
        event?: { app_user_id?: string; aliases?: string[] }
      } | null
      const appUserId = body?.event?.app_user_id
      if (!appUserId) return Response.json({ error: 'Missing app_user_id' }, { status: 400 })

      const tier = await fetchTier(appUserId, apiKey)
      const ids = new Set<string>([appUserId, ...(body?.event?.aliases ?? [])])
      const at = new Date().toISOString()
      const rows = [...ids].map((id) => ({ id, tier, at }))

      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
      try {
        for (const row of rows) {
          await pool.query(
            `insert into public.entitlements (app_user_id, tier, updated_at)
             values ($1, $2, $3)
             on conflict (app_user_id) do update
             set tier = excluded.tier, updated_at = excluded.updated_at`,
            [row.id, row.tier, row.at],
          )
        }
      } finally {
        await pool.end().catch(() => {})
      }

      return Response.json({ ok: true, tier, ids: rows.length, mirrored: false })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    }
  },
}
