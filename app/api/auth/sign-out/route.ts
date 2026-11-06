import { NextResponse } from 'next/server'
import { dropSession } from '@/lib/neon/accounts'
import { SESSION_COOKIE } from '@/lib/neon/env'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : null
  const jar = await cookies()
  await dropSession(bearer ?? jar.get(SESSION_COOKIE)?.value)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
