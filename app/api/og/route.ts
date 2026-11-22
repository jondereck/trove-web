import { NextResponse } from 'next/server'
import { fetchLinkPreview, hostnameOf } from '@/lib/og/boundedPreview'
import { proxyNeonFunction } from '@/lib/neon/functionProxy'

export async function POST(request: Request) {
  const raw = await request.arrayBuffer()
  const replay = () => new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: raw.byteLength ? raw : undefined,
  })

  let proxied: Response | null = null
  try {
    proxied = await proxyNeonFunction('og', replay(), 5000)
  } catch {
    proxied = null
  }
  if (proxied && proxied.status < 500) return proxied

  let body: { url?: string } | null = null
  try {
    body = JSON.parse(new TextDecoder().decode(raw) || 'null') as { url?: string } | null
  } catch {
    body = null
  }
  const url = body?.url ?? ''
  if (!url) return NextResponse.json({ url: '', title: '' })
  try {
    const preview = await fetchLinkPreview(url)
    return NextResponse.json(preview)
  } catch {
    return NextResponse.json({ url, title: hostnameOf(url) })
  }
}
