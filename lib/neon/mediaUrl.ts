/** Build / rewrite Neon Object Storage URLs so browsers skip the Vercel /api/media proxy. */

export type MediaPublicBase = {
  endpoint: string
  bucket: string
}

const PROXY_PATH = /\/api\/media\/(.+)$/i

export function readMediaPublicBase(env: NodeJS.ProcessEnv = process.env): MediaPublicBase | null {
  const endpoint = (
    env.NEXT_PUBLIC_NEON_STORAGE_ENDPOINT
    || env.NEON_STORAGE_ENDPOINT
    || env.EXPO_PUBLIC_NEON_STORAGE_ENDPOINT
    || ''
  ).replace(/\/$/, '')
  const bucket = (
    env.NEXT_PUBLIC_NEON_STORAGE_BUCKET
    || env.NEON_STORAGE_BUCKET
    || env.EXPO_PUBLIC_NEON_STORAGE_BUCKET
    || 'media'
  ).trim()
  if (!endpoint || !bucket) return null
  return { endpoint, bucket }
}

export function mediaObjectPublicUrl(path: string, base: MediaPublicBase | null = readMediaPublicBase()): string | null {
  if (!base) return null
  const key = path.replace(/^\/+/, '')
  if (!key || key.includes('..')) return null
  return `${base.endpoint}/${base.bucket}/${key}`
}

export function mediaPathFromProxyUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(PROXY_PATH)
    if (!match?.[1]) return null
    return decodeURIComponent(match[1])
  } catch {
    const match = url.match(PROXY_PATH)
    if (!match?.[1]) return null
    try {
      return decodeURIComponent(match[1])
    } catch {
      return match[1]
    }
  }
}

/** Prefer a direct Neon URL when the save still points at /api/media/…. */
export function rewriteProxiedMediaUrl(
  url: string | null | undefined,
  base: MediaPublicBase | null = readMediaPublicBase(),
): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  if (!base) return trimmed
  const path = mediaPathFromProxyUrl(trimmed)
  if (!path) return trimmed
  return mediaObjectPublicUrl(path, base) ?? trimmed
}
