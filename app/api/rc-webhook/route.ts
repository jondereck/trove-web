import { NextResponse } from 'next/server'
import { neonPool } from '@/lib/neon/pool'
import { proxyNeonFunction } from '@/lib/neon/functionProxy'

/**
 * RevenueCat webhook → entitlements (port of the Supabase edge function).
 *
 * RevenueCat dashboard → Integrations → Webhooks:
 *   POST https://web-trove.vercel.app/api/rc-webhook
 *   Authorization header: <RC_WEBHOOK_SECRET> (raw value, no "Bearer")
 *
 * Every event re-queries RevenueCat for the customer's CURRENT state — never
 * trust the event payload's tier. The result is stored under the primary
 * app_user_id and every alias so any client id resolves the same tier.
 */

const ENTITLEMENT_CLOUD = 'cloud'
const ENTITLEMENT_UNLOCKED = 'unlocked'

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status })
}

type RevenueCatEntitlement = { expires_date?: string | null }

type Tier = 'free' | 'unlocked' | 'cloud'

async function fetchTier(appUserId: string, apiKey: string): Promise<Tier> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  )
  if (!res.ok) throw new Error(`RevenueCat API ${res.status}`)
  const data = await res.json() as {
    subscriber?: { entitlements?: Record<string, RevenueCatEntitlement> }
  }
  const entitlements = data?.subscriber?.entitlements ?? {}
  const now = Date.now()
  const isActive = (key: string) => {
    const ent = entitlements[key]
    if (!ent) return false
    // Lifetime purchases have no expires_date.
    return !ent.expires_date || new Date(ent.expires_date).getTime() > now
  }
  if (isActive(ENTITLEMENT_CLOUD)) return 'cloud'
  if (isActive(ENTITLEMENT_UNLOCKED)) return 'unlocked'
  return 'free'
}

async function writeNeon(rows: { id: string; tier: Tier; at: string }[]): Promise<void> {
  const pool = neonPool()
  for (const row of rows) {
    await pool.query(
      `insert into public.entitlements (app_user_id, tier, updated_at)
       values ($1, $2, $3)
       on conflict (app_user_id) do update
       set tier = excluded.tier, updated_at = excluded.updated_at`,
      [row.id, row.tier, row.at],
    )
  }
}

/** Keep the legacy Supabase ai-proxy in sync when the service key is configured. */
async function writeSupabase(rows: { id: string; tier: Tier; at: string }[]): Promise<boolean> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !key) return false
  const res = await fetch(`${url}/rest/v1/entitlements?on_conflict=app_user_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows.map(row => ({
      app_user_id: row.id,
      tier: row.tier,
      updated_at: row.at,
    }))),
  })
  if (!res.ok) throw new Error(`Supabase entitlements ${res.status}`)
  return true
}

export async function POST(request: Request) {
  const proxied = await proxyNeonFunction('rcwebhook', request)
  if (proxied) return proxied

  const secret = process.env.RC_WEBHOOK_SECRET ?? ''
  if (!secret || request.headers.get('authorization') !== secret) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const apiKey = process.env.RC_API_KEY ?? ''
  if (!apiKey || !process.env.DATABASE_URL) {
    return json({ error: 'Webhook secrets not configured' }, 500)
  }

  try {
    const body = await request.json().catch(() => null) as {
      event?: { app_user_id?: string; aliases?: string[] }
    } | null
    const appUserId = body?.event?.app_user_id
    if (!appUserId) return json({ error: 'Missing app_user_id' }, 400)

    const tier = await fetchTier(appUserId, apiKey)
    const ids = new Set<string>([appUserId, ...((body?.event?.aliases ?? []))])
    const at = new Date().toISOString()
    const rows = [...ids].map(id => ({ id, tier, at }))

    await writeNeon(rows)
    const mirrored = await writeSupabase(rows).catch(() => false)

    return json({ ok: true, tier, ids: rows.length, mirrored })
  } catch (error) {
    // A 500 makes RevenueCat retry — safe because every event re-reads the
    // authoritative subscriber state and the upsert is idempotent.
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
}

export async function GET() {
  return json({ error: 'POST only' }, 405)
}
