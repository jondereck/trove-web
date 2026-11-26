import { NextResponse } from 'next/server'
import { neonUserId } from '@/lib/neon/client'
import { neonPool } from '@/lib/neon/pool'
import { runQuery, type QueryState } from '@/lib/neon/query'

export const preferredRegion = 'sin1'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { state?: QueryState } | null
  if (!body?.state) {
    return NextResponse.json({ data: null, error: { message: 'Missing query' }, count: null }, { status: 400 })
  }
  const userId = await neonUserId(request)
  const t0 = Date.now()
  const result = await runQuery((sql, params) => neonPool().query(sql, params), body.state, userId)
  return NextResponse.json(result, {
    headers: { 'Server-Timing': `db;dur=${Date.now() - t0}` },
  })
}
