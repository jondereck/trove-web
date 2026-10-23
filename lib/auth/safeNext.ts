const ALLOWED = ['/oauth/consent', '/library', '/c/']

/** Internal path only. Blocks protocol-relative and off-site redirects. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  let url: URL
  try {
    url = new URL(value, 'http://trove.local')
  } catch {
    return null
  }
  if (url.origin !== 'http://trove.local') return null
  const path = url.pathname
  const allowed = ALLOWED.some((prefix) => path === prefix || path.startsWith(prefix))
  if (!allowed) return null
  return path + url.search
}
