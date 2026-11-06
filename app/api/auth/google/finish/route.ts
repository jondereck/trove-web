import { NextResponse } from 'next/server'
import { claimNeonGoogleSession, linkAppUser, openSession, releasePasswordOnlyNeonUsers, userFromNeonSession } from '@/lib/neon/accounts'
import { SESSION_COOKIE } from '@/lib/neon/env'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string; nonce?: string; error?: string } | null
  if (body?.error === 'account_not_linked') {
    await releasePasswordOnlyNeonUsers()
    return NextResponse.json({
      retry: true,
      error: 'That email already had a password login. Tap Google again. It will connect to your library.',
    })
  }
  const sessionToken = body?.token?.trim() ?? ''
  const nonce = body?.nonce?.trim() ?? ''
  const neonUser = sessionToken
    ? await userFromNeonSession(sessionToken)
    : nonce
      ? await claimNeonGoogleSession(request, nonce)
      : null
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
