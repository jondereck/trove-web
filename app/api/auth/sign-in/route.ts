import { NextResponse } from 'next/server'
import { linkAppUser, neonEmailAuth, openSession } from '@/lib/neon/accounts'
import { SESSION_COOKIE } from '@/lib/neon/env'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null
  const email = body?.email?.trim() ?? ''
  const password = body?.password ?? ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  let result = await neonEmailAuth('sign-in/email', { email, password })
  if (result.error && /invalid email or password/i.test(result.error)) {
    const created = await neonEmailAuth('sign-up/email', { email, password, name: email })
    if (created.user) result = created
  }
  if (result.error || !result.user) {
    return NextResponse.json({ error: result.error ?? 'Sign-in failed' }, { status: 401 })
  }
  const appUserId = await linkAppUser(result.user)
  const token = await openSession(appUserId, result.user.email)
  const response = NextResponse.json({
    token,
    user: { id: appUserId, email: result.user.email },
  })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
