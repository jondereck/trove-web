import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto')
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  if (proto === 'http' && !isLocal) {
    const httpsUrl = request.nextUrl.clone()
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, 308)
  }
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/mcp|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
