import { NextResponse } from 'next/server'
import { neonEmailAuth } from '@/lib/neon/accounts'
import { siteUrl } from '@/lib/env'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string } | null
  const email = body?.email?.trim() ?? ''
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  const result = await neonEmailAuth('request-password-reset', {
    email,
    redirectTo: `${siteUrl()}/login`,
  })
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
