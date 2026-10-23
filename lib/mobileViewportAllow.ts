/**
 * Paths that must render on small viewports even when the rest of Trove Web
 * shows the "Best on desktop" gate (shared collection links).
 */
export function isMobileAllowedPath(pathname: string, search = ''): boolean {
  if (!pathname) return false
  const path = pathname.split('?')[0]?.split('#')[0] ?? ''
  if (path === '/c' || path.startsWith('/c/')) return true
  if (path.startsWith('/oauth/') || path.startsWith('/auth/')) return true
  if (path === '/') {
    const next = new URLSearchParams(search.replace(/^\?/, '')).get('next') ?? ''
    return next.startsWith('/oauth/') || next.startsWith('/auth/')
  }
  return false
}
