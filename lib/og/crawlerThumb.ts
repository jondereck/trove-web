const CRAWLER_THUMB_HOSTS = new Set([
  'lookaside.fbsbx.com',
  'lookaside.instagram.com',
])

export function isCrawlerOnlyThumb(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (CRAWLER_THUMB_HOSTS.has(host)) return true
    return host.startsWith('lookaside.') && (
      host.endsWith('.fbsbx.com')
      || host.endsWith('.facebook.com')
      || host.endsWith('.instagram.com')
      || host.endsWith('.cdninstagram.com')
    )
  } catch {
    return /lookaside\.fbsbx\.com/i.test(url)
  }
}

export function isFacebookCdnHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('fbcdn.net')
      || host.includes('fbsbx.com')
      || host.includes('facebook.com')
      || host.includes('cdninstagram.com')
      || host.includes('instagram.com')
  } catch {
    return false
  }
}

/** Server should download and re-host before returning image to the app. */
export function shouldRehostOgImage(url: string | undefined): boolean {
  if (!url?.trim()) return false
  if (isCrawlerOnlyThumb(url)) return true
  if (/&(amp|#)/i.test(url)) return true
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('lookaside.') || host.includes('fbsbx.com')) return true
  } catch {
  }
  return false
}