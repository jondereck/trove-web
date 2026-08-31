import { supabaseAnonKey, supabaseUrl } from './env'
import type { OGMetadata } from './types'

export async function fetchOGMetadata(url: string): Promise<OGMetadata> {
  const hostFallback = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  })()

  const base: OGMetadata = { url, title: hostFallback }
  const endpoint = `${supabaseUrl()}/functions/v1/fetch-og`
  const key = supabaseAnonKey()
  if (!endpoint.includes('supabase') || !key) return base

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) return base
    const raw = (await res.json()) as Record<string, unknown>
    return {
      url: typeof raw.url === 'string' ? raw.url : url,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : hostFallback,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      image: typeof raw.image === 'string' ? raw.image : undefined,
      siteName: typeof raw.siteName === 'string' ? raw.siteName : undefined,
      viewCount: typeof raw.viewCount === 'number' ? raw.viewCount : undefined,
      reactionCount: typeof raw.reactionCount === 'number' ? raw.reactionCount : undefined,
    }
  } catch {
    return base
  }
}
