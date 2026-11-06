import { NextResponse } from 'next/server'
import { authOrigin, openGoogleNonce, startNeonGoogle } from '@/lib/neon/accounts'

export async function GET(request: Request) {
  const from = new URL(request.url).searchParams.get('from')
  const nonce = await openGoogleNonce()
  const callback = new URL(`${authOrigin()}/auth/neon`)
  callback.searchParams.set('nonce', nonce)
  if (from === 'mobile') callback.searchParams.set('from', 'mobile')
  const result = await startNeonGoogle(callback.toString())
  if (!result.url) {
    return NextResponse.json({ error: result.error ?? 'Could not start Google sign-in.' }, { status: 400 })
  }
  return NextResponse.json({ url: result.url })
}
