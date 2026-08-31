export function saveCardDomain(url?: string): string {
  if (!url?.trim()) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
}

type BrandTile = {
  bg: string
  accent: string
}

const BRAND_TILES: Record<string, BrandTile> = {
  'facebook.com': { bg: '#e8f0ff', accent: '#1877f2' },
  'youtube.com': { bg: '#ffecec', accent: '#ff0000' },
  'youtu.be': { bg: '#ffecec', accent: '#ff0000' },
  'github.com': { bg: '#eef1f4', accent: '#24292f' },
  'figma.com': { bg: '#f3ecff', accent: '#a259ff' },
  'instagram.com': { bg: '#fceef6', accent: '#e1306c' },
  'tiktok.com': { bg: '#eef6f8', accent: '#010101' },
  'x.com': { bg: '#eef0f2', accent: '#000000' },
  'twitter.com': { bg: '#eef0f2', accent: '#000000' },
  'open.spotify.com': { bg: '#e8f8ee', accent: '#1db954' },
  'spotify.com': { bg: '#e8f8ee', accent: '#1db954' },
}

export function brandTileForDomain(domain: string): BrandTile {
  if (!domain) return { bg: '#fdf0eb', accent: '#c0613c' }
  const key = Object.keys(BRAND_TILES).find(host => domain === host || domain.endsWith(`.${host}`))
  return key ? BRAND_TILES[key]! : { bg: '#f5f4f0', accent: '#666666' }
}

export function brandTileForType(type: string): BrandTile {
  if (type === 'note') return { bg: '#fdf6ef', accent: '#c0613c' }
  if (type === 'image') return { bg: '#eef8f0', accent: '#2a7a4f' }
  if (type === 'video') return { bg: '#ffecec', accent: '#c0613c' }
  if (type === 'tracker') return { bg: '#eef4ff', accent: '#4a4aaa' }
  return { bg: '#fdf0eb', accent: '#c0613c' }
}
