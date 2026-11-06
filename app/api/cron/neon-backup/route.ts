import { NextResponse } from 'next/server'
import { copyNeonToSupabase } from '@/lib/neon/backup'

export async function GET(request: Request) {
  return POST(request)
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const counts = await copyNeonToSupabase()
  return NextResponse.json({ ok: true, counts })
}
