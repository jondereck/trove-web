const GENERIC_TITLES = new Set([
  'facebook',
  'facebook.com',
  'm.facebook.com',
  'instagram',
  'instagram.com',
  'tiktok',
  'tiktok.com',
  'vt.tiktok.com',
  'threads',
  'threads.net',
  'x',
  'x.com',
  'twitter',
  'twitter.com',
])

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

export function isGenericSocialTitle(
  title: string | undefined,
  url: string,
  siteName?: string,
): boolean {
  const t = (title ?? '').trim().toLowerCase()
  if (!t) return true
  if (/^log ?in/.test(t)) return true
  if (GENERIC_TITLES.has(t)) return true
  const host = hostnameOf(url)
  if (host && t === host) return true
  if (siteName && t === siteName.trim().toLowerCase()) return true
  return false
}
