const PAGE_MS = 3500

function decodeOgText(value: string | null | undefined): string | undefined {
  if (value == null) return undefined
  const s = typeof value === 'string' ? value : String(value)
  const trimmed = s.trim()
  if (!trimmed) return undefined
  return trimmed
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function meta(html: string, key: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    'i',
  )
  const swapped = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
    'i',
  )
  return html.match(pattern)?.[1] ?? html.match(swapped)?.[1]
}

const PLATFORM_TITLE = /^([\s\S]+?)\s+on\s+(Instagram|Threads|Facebook):\s*["']([\s\S]+?)["']\s*$/

function fieldsFromOEmbed(
  data: Record<string, unknown> | null,
  url: string,
  siteName: string,
) {
  if (!data) return null
  const oembedTitle = decodeOgText(typeof data.title === 'string' ? data.title : undefined) ?? ''
  const author = decodeOgText(typeof data.author_name === 'string' ? data.author_name : undefined) ?? ''
  const image = decodeOgText(typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined) ?? ''
  const split = oembedTitle.match(PLATFORM_TITLE)
  const caption = split?.[3]?.trim() || (oembedTitle && oembedTitle !== author && !split ? oembedTitle : '')
  const title = author || split?.[1]?.trim() || caption
  if (!title && !image) return null
  return {
    url,
    title: title || siteName,
    description: title && caption && caption !== title ? caption : undefined,
    image: image || undefined,
    siteName,
  }
}

function oEmbedTargets(url: string): { endpoint: string; siteName: string }[] {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return []
  }
  if (host.includes('instagram')) {
    return [{ endpoint: `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`, siteName: 'Instagram' }]
  }
  if (host.includes('threads')) {
    return [{ endpoint: `https://www.threads.net/oembed?url=${encodeURIComponent(url)}`, siteName: 'Threads' }]
  }
  if (host.includes('facebook') || host.includes('fb.com') || host.includes('fb.watch')) {
    return [
      { endpoint: `https://www.facebook.com/plugins/post/oembed.json?url=${encodeURIComponent(url)}&omitscript=true`, siteName: 'Facebook' },
      { endpoint: `https://www.facebook.com/plugins/video/oembed.json?url=${encodeURIComponent(url)}&omitscript=true`, siteName: 'Facebook' },
    ]
  }
  return []
}

async function readOEmbed(endpoint: string, url: string, siteName: string) {
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>
    return fieldsFromOEmbed(data, url, siteName)
  } catch {
    return null
  }
}

async function fetchLinkPreview(url: string) {
  const host = hostnameOf(url)
  const targets = oEmbedTargets(url)
  const oembeds = await Promise.all(targets.map(target => readOEmbed(target.endpoint, url, target.siteName)))
  const fromOembed = oembeds.find(item => item && item.title && item.title.toLowerCase() !== host.toLowerCase()) ?? null
  if (fromOembed?.image && fromOembed.title.toLowerCase() !== host.toLowerCase()) return fromOembed
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(PAGE_MS),
    })
    const html = await response.text()
    return {
      url,
      title: decodeOgText(meta(html, 'og:title')) ?? fromOembed?.title ?? host,
      description: decodeOgText(meta(html, 'og:description')) ?? fromOembed?.description,
      image: decodeOgText(meta(html, 'og:image')) ?? fromOembed?.image,
      siteName: decodeOgText(meta(html, 'og:site_name')) ?? fromOembed?.siteName ?? host,
    }
  } catch {
    return fromOembed ?? { url, title: host, siteName: host }
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'POST only' }, { status: 405 })
    }
    const body = (await request.json().catch(() => null)) as { url?: string } | null
    const url = body?.url ?? ''
    if (!url) return Response.json({ url: '', title: '' })
    const preview = await fetchLinkPreview(url)
    return Response.json(preview)
  },
}
