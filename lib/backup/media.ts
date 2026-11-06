export const MEDIA_SCHEME = 'trove-media://'

export function mediaSentinel(name: string): string {
  return `${MEDIA_SCHEME}${requireSafeMediaBasename(name)}`
}

export function parseMediaSentinel(val?: string): string | undefined {
  if (!val?.startsWith(MEDIA_SCHEME)) return undefined
  return requireSafeMediaBasename(val.slice(MEDIA_SCHEME.length))
}

export function requireSafeMediaBasename(name: string): string {
  const unsafe = (): never => {
    throw new Error('The backup contains an unsafe media filename.')
  }
  const assertSafe = (candidate: string) => {
    if (
      !candidate.trim() ||
      candidate === '.' ||
      candidate === '..' ||
      /[\/\\]/.test(candidate) ||
      /[\u0000-\u001f\u007f-\u009f]/.test(candidate) ||
      /^[A-Za-z][A-Za-z0-9+.-]*:/.test(candidate)
    ) {
      unsafe()
    }
  }

  let decoded = name
  const seen = new Set<string>()
  while (true) {
    assertSafe(decoded)
    if (!decoded.includes('%')) break
    if (seen.has(decoded)) unsafe()
    seen.add(decoded)
    let next = ''
    try {
      next = decodeURIComponent(decoded)
    } catch {
      unsafe()
    }
    if (next === decoded) break
    decoded = next
  }
  return name
}

export function shouldBundleWebMedia(uri: string | undefined | null): boolean {
  if (!uri) return false
  return uri.startsWith(MEDIA_SCHEME) || uri.startsWith('blob:') || uri.startsWith('data:')
}

export function mimeFromMediaName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
}
