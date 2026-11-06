import { NextResponse } from 'next/server'
import { neonUserId, createNeonClient } from '@/lib/neon/client'

export async function GET(request: Request) {
  const userId = await neonUserId(request)
  if (!userId) return NextResponse.json({ user: null })
  const client = await createNeonClient(request)
  const session = await client.auth.getSession()
  return NextResponse.json({ user: session.data.session?.user ?? null, token: session.data.session?.access_token ?? null })
}
