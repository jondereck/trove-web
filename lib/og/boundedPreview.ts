export const OG_PAGE_MS = 3500

export type OgPreview = {
  url: string
  title: string
  description?: string
  image?: string
  siteName?: string
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function metaContent(html: string, key: string): string | undefined {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i')
  const swapped = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i')
  return html.match(pattern)?.[1] ?? html.match(swapped)?.[1]
}

const PLATFORM_TITLE = /^([\s\S]+?)\s+on\s+(Instagram|Threads|Facebook):\s*["']([\s\S]+?)["']\s*$/

export function fieldsFromOEmbed(
  data: Record<string, unknown> | null,
  url: string,
  siteName: string,
): OgPreview | null {
  if (!data) return null
  const oembedTitle = typeof data.title === 'string' ? data.title.trim() : ''
  const author = typeof data.author_name === 'string' ? data.author_name.trim() : ''
  const image = typeof data.thumbnail_url === 'string' ? data.thumbnail_url.trim() : ''
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

async function readOEmbed(endpoint: string, url: string, siteName: string): Promise<OgPreview | null> {
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

function useful(preview: OgPreview | null, host: string): preview is OgPreview {
  if (!preview?.title) return false
  const title = preview.title.trim().toLowerCase()
  if (!title || title === host.toLowerCase() || title === preview.siteName?.trim().toLowerCase()) return false
  if (/^log ?in/.test(title)) return false
  return true
}

/** oEmbed in parallel, then one short HTML scrape. Never waits on a stalled Facebook socket. */
export async function fetchLinkPreview(url: string): Promise<OgPreview> {
  const host = hostnameOf(url)
  const targets = oEmbedTargets(url)
  const oembeds = await Promise.all(targets.map(target => readOEmbed(target.endpoint, url, target.siteName)))
  const fromOembed = oembeds.find(item => useful(item, host)) ?? oembeds.find(item => item?.title || item?.image) ?? null
  if (fromOembed && useful(fromOembed, host) && fromOembed.image) return fromOembed

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(OG_PAGE_MS),
    })
    const html = await response.text()
    return {
      url,
      title: metaContent(html, 'og:title') ?? fromOembed?.title ?? host,
      description: metaContent(html, 'og:description') ?? fromOembed?.description,
      image: metaContent(html, 'og:image') ?? fromOembed?.image,
      siteName: metaContent(html, 'og:site_name') ?? fromOembed?.siteName ?? host,
    }
  } catch {
    return fromOembed ?? { url, title: host, siteName: host }
  }
}
