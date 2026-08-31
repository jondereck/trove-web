import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/library'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const url = new URL(next, origin)
      url.searchParams.set('signed_in', '1')
      return NextResponse.redirect(url)
    }
  }

  const fail = new URL('/', origin)
  fail.searchParams.set('error', 'Could not complete sign-in. Try again or use email.')
  return NextResponse.redirect(fail)
}
