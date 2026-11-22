import { NextResponse } from 'next/server'
import { supabaseMirrorEnabled } from '@/lib/dataBackend'
import { copyNeonToSupabase } from '@/lib/neon/backup'
import { proxyNeonFunction } from '@/lib/neon/functionProxy'

export async function GET(request: Request) {
  return POST(request)
}

export async function POST(request: Request) {
  if (!supabaseMirrorEnabled()) {
    const secret = process.env.CRON_SECRET
    const header = request.headers.get('authorization') ?? ''
    if (!secret || header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'SUPABASE_MIRROR is off. Neon is the live store. Set SUPABASE_MIRROR=1 to copy into the Supabase PG17 mirror.',
    })
  }

  const proxied = await proxyNeonFunction('neonbackup', request)
  if (proxied) return proxied

  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const counts = await copyNeonToSupabase()
  return NextResponse.json({ ok: true, counts })
}
