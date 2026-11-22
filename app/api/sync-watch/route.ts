import { NextResponse } from 'next/server'
import { neonUserId } from '@/lib/neon/client'
import { proxyNeonFunction } from '@/lib/neon/functionProxy'
import { neonPool } from '@/lib/neon/pool'
import { loadSyncWatch } from '@/lib/neon/syncWatch'

export async function GET(request: Request) {
  const proxied = await proxyNeonFunction('syncwatch', request)
  if (proxied) return proxied

  const userId = await neonUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const t0 = Date.now()
  const pool = neonPool()
  const payload = await loadSyncWatch(
    (sql, params) => pool.query(sql, params),
    userId,
  )
  return NextResponse.json(payload, {
    headers: { 'Server-Timing': `sync-watch;dur=${Date.now() - t0}` },
  })
}

export async function POST(request: Request) {
  return GET(request)
}
