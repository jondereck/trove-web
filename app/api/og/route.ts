import { NextResponse } from 'next/server'

function meta(html: string, key: string): string | undefined {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i')
  const swapped = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i')
  return html.match(pattern)?.[1] ?? html.match(swapped)?.[1]
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { url?: string } | null
  const url = body?.url ?? ''
  let host = url
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* keep */ }
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      redirect: 'follow',
    })
    const html = await response.text()
    return NextResponse.json({
      url,
      title: meta(html, 'og:title') ?? host,
      description: meta(html, 'og:description'),
      image: meta(html, 'og:image'),
      siteName: meta(html, 'og:site_name'),
    })
  } catch {
    return NextResponse.json({ url, title: host })
  }
}
