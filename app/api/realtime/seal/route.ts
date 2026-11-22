import { NextResponse } from 'next/server'
import { neonUserId } from '@/lib/neon/client'
import { sealSyncWatchQueries } from '@/lib/neon/realtime'

export async function GET(request: Request) {
  if (!process.env.NEON_REALTIME_SECRET || !process.env.NEON_REALTIME_URL) {
    return NextResponse.json({ error: 'Realtime not configured' }, { status: 503 })
  }
  const userId = await neonUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const sealed = await sealSyncWatchQueries(userId)
    return NextResponse.json({
      url: process.env.NEON_REALTIME_URL,
      ...sealed,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'seal failed' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
