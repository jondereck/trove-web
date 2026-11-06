import { NextResponse } from 'next/server'
import { authOrigin, startNeonGoogle } from '@/lib/neon/accounts'

export async function GET(request: Request) {
  const from = new URL(request.url).searchParams.get('from')
  const callback = `${authOrigin()}/auth/neon${from === 'mobile' ? '?from=mobile' : ''}`
  const result = await startNeonGoogle(callback)
  if (!result.url) {
    return NextResponse.json({ error: result.error ?? 'Could not start Google sign-in.' }, { status: 400 })
  }
  return NextResponse.json({ url: result.url })
}
