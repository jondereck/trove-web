const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

function decodeOnce(value: string): string {
  return value
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED[name.toLowerCase()] ?? match)
    .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) => {
      const cp = parseInt(hex, 16)
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match
    })
    .replace(/&#(\d+);/g, (match, dec: string) => {
      const cp = Number(dec)
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match
    })
}

/** Decode HTML entities in og:title / og:image (keeps mobile cards and FB hashes valid). */
export function decodeOgText(value: string | null | undefined): string | undefined {
  if (value == null) return undefined
  const s = typeof value === 'string' ? value : String(value)
  const trimmed = s.trim()
  if (!trimmed) return undefined
  if (!trimmed.includes('&')) return trimmed
  const once = decodeOnce(trimmed)
  return once.includes('&') ? decodeOnce(once) : once
}