import { NextResponse } from 'next/server'
import { fetchLinkPreview, hostnameOf, type OgPreview } from '@/lib/og/boundedPreview'
import { finalizeOgPreview } from '@/lib/og/finalizePreview'
import { rateLimit } from '@/lib/og/rateLimit'
import { neonUserId } from '@/lib/neon/client'
import { proxyNeonFunction } from '@/lib/neon/functionProxy'

const OG_RATE_MAX = 40
const OG_RATE_WINDOW_MS = 60_000

export async function POST(request: Request) {
  const raw = await request.arrayBuffer()
  const replay = () => new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: raw.byteLength ? raw : undefined,
  })

  let body: { url?: string } | null = null
  try {
    body = JSON.parse(new TextDecoder().decode(raw) || 'null') as { url?: string } | null
  } catch {
    body = null
  }
  const url = body?.url ?? ''
  if (!url) return NextResponse.json({ url: '', title: '' })

  const userId = await neonUserId(request)
  const limitKey = userId ?? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon')
  if (!rateLimit(`og:${limitKey}`, OG_RATE_MAX, OG_RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many preview requests' }, { status: 429 })
  }

  let preview: OgPreview | null = null
  let proxied: Response | null = null
  try {
    proxied = await proxyNeonFunction('og', replay(), 5000)
  } catch {
    proxied = null
  }
  if (proxied && proxied.status < 500) {
    try {
      preview = await proxied.json() as OgPreview
    } catch {
      preview = null
    }
  }
  if (!preview) {
    try {
      preview = await fetchLinkPreview(url)
    } catch {
      return NextResponse.json({ url, title: hostnameOf(url) })
    }
  }

  try {
    const finalized = await finalizeOgPreview(preview, userId)
    return NextResponse.json(finalized)
  } catch {
    return NextResponse.json(preview)
  }
}