const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"']+/gi

export function isHttpUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim())
}

function compactWrappedUrlLines(text: string): string {
  return text
    // Join line-wrapped path/query segments after a URL stem.
    .replace(/(https?:\/\/[^\s<>"']*[/?#])\s+([A-Za-z0-9._~%!$&'()*+,;=:@/?#-]+)/gi, '$1$2')
    // Join host/path splits like "https://facebook.com\n/share/..."
    .replace(/(https?:\/\/[^\s<>"']+)\s+(\/[A-Za-z0-9._~%!$&'()*+,;=:@/?#-]+)/gi, '$1$2')
}

function trimUrlPunctuation(raw: string): string {
  const strippedLeading = raw.replace(/^[([{<"']+/, '')
  return strippedLeading.replace(/[)\]>.,;!?'"`]+$/, '')
}

function extractFacebookRedirectTarget(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (!host.includes('facebook.com') && !host.includes('fb.com')) return null
  const path = url.pathname.toLowerCase()
  if (!path.endsWith('/l.php') && !path.endsWith('/share.php')) return null
  const target = url.searchParams.get('u')
  if (!target) return null
  try {
    const parsed = new URL(target)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString()
  } catch {
    return null
  }
  return null
}

export function normalizeQuickSaveUrl(raw: string): string {
  const trimmed = trimUrlPunctuation(raw.trim())
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    const nested = extractFacebookRedirectTarget(parsed)
    if (nested) return normalizeQuickSaveUrl(nested)
    return parsed.toString()
  } catch {
    return trimmed
  }
}

export function extractFirstHttpUrl(text: string): string | null {
  const compact = compactWrappedUrlLines(text)
  const match = compact.match(URL_IN_TEXT_RE)
  if (!match?.length) return null
  const normalized = normalizeQuickSaveUrl(match[0] ?? '')
  return isHttpUrl(normalized) ? normalized : null
}


export function parseQuickSaveInput(text: string): {
  kind: 'url' | 'note' | 'empty'
  url?: string
  contextText?: string
} {
  const compacted = compactWrappedUrlLines(text)
  const trimmed = compacted.trim()
  if (!trimmed) return { kind: 'empty' }

  if (isHttpUrl(trimmed)) {
    return { kind: 'url', url: normalizeQuickSaveUrl(trimmed) }
  }

  const url = extractFirstHttpUrl(trimmed)
  if (url) {
    const contextText = trimmed
      .replace(URL_IN_TEXT_RE, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      kind: 'url',
      url,
      contextText: contextText && contextText !== url ? contextText : undefined,
    }
  }

  return { kind: 'note' }
}

export function classifyQuickSaveInput(text: string): 'url' | 'note' | 'empty' {
  return parseQuickSaveInput(text).kind
}
