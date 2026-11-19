import { NextResponse } from 'next/server'
import { neonUserId } from '@/lib/neon/client'
import { neonPool } from '@/lib/neon/pool'
import { runQuery, type QueryResult, type QueryState } from '@/lib/neon/query'

const MAX_STATES = 12

/**
 * Read-only batch: one auth check + one HTTP round trip for a screen's queries.
 * Writes are deliberately rejected — a batch must be safe to retry.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { states?: QueryState[] } | null
  const states = body?.states
  if (!Array.isArray(states) || states.length === 0) {
    return NextResponse.json({ error: 'Missing states' }, { status: 400 })
  }
  if (states.length > MAX_STATES) {
    return NextResponse.json({ error: 'Too many states' }, { status: 400 })
  }
  if (states.some(state => state?.action !== 'select')) {
    return NextResponse.json({ error: 'Batch is read-only' }, { status: 400 })
  }

  const userId = await neonUserId(request)
  const pool = neonPool()
  const t0 = Date.now()
  const results: QueryResult[] = await Promise.all(
    states.map(state => runQuery((sql, params) => pool.query(sql, params), state, userId)),
  )
  return NextResponse.json(
    { results },
    { headers: { 'Server-Timing': `db;dur=${Date.now() - t0}` } },
  )
}
