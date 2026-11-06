import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { neonAuthPost, readSession } from '@/lib/neon/accounts'
import { SESSION_COOKIE } from '@/lib/neon/env'

const MIN_LENGTH = 8

async function sessionEmail(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : null
  if (bearer) {
    const session = await readSession(bearer)
    return session?.email ?? null
  }
  const jar = await cookies()
  const session = await readSession(jar.get(SESSION_COOKIE)?.value)
  return session?.email ?? null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    step?: string
    email?: string
    otp?: string
    password?: string
  } | null
  const signedInEmail = await sessionEmail(request)
  const email = (signedInEmail ?? body?.email ?? '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  if (body?.step === 'send') {
    const result = await neonAuthPost('email-otp/request-password-reset', { email })
    if (!result.ok) return NextResponse.json({ error: result.error ?? 'Could not send the code.' }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body?.step === 'confirm') {
    const otp = (body.otp ?? '').replace(/\D/g, '')
    const password = body.password ?? ''
    if (otp.length !== 6) return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
    if (password.length < MIN_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_LENGTH} characters.` }, { status: 400 })
    }
    const result = await neonAuthPost('email-otp/reset-password', { email, otp, password })
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'That code did not work.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
}
