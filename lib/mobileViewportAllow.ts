/**
 * Paths that must render on small viewports even when the rest of Trove Web
 * shows the "Best on desktop" gate (shared collection links).
 */
export function isMobileAllowedPath(pathname: string): boolean {
  if (!pathname) return false
  const path = pathname.split('?')[0]?.split('#')[0] ?? ''
  return path === '/c' || path.startsWith('/c/')
}
