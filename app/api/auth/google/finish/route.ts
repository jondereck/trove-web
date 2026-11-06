import { NextResponse } from 'next/server'
import { linkAppUser, openSession, userFromNeonSession } from '@/lib/neon/accounts'
import { SESSION_COOKIE } from '@/lib/neon/env'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string } | null
  const sessionToken = body?.token?.trim() ?? ''
  if (!sessionToken) return NextResponse.json({ error: 'Missing Google session' }, { status: 400 })
  const neonUser = await userFromNeonSession(sessionToken)
  if (!neonUser) return NextResponse.json({ error: 'Google sign-in expired. Try again.' }, { status: 401 })
  const appUserId = await linkAppUser(neonUser)
  const token = await openSession(appUserId, neonUser.email)
  const response = NextResponse.json({ token, user: { id: appUserId, email: neonUser.email } })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
