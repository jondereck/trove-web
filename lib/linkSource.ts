export type LinkSource = 'github' | 'docs'

const GITHUB_HOSTS = new Set(['github.com', 'gist.github.com'])

type DocsRule = { host: string; pathPrefix?: string }

const DOCS_RULES: DocsRule[] = [
  { host: 'docs.expo.dev' },
  { host: 'docs.expo.io' },
  { host: 'reactnative.dev' },
  { host: 'react.dev' },
  { host: 'developer.mozilla.org' },
  { host: 'docs.github.com' },
  { host: 'supabase.com', pathPrefix: '/docs' },
  { host: 'nextjs.org', pathPrefix: '/docs' },
  { host: 'typescriptlang.org', pathPrefix: '/docs' },
]

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname || '/'
  } catch {
    return ''
  }
}

function matchesDocsRule(host: string, pathname: string, rule: DocsRule): boolean {
  if (host !== rule.host) return false
  if (!rule.pathPrefix) return true
  return pathname === rule.pathPrefix || pathname.startsWith(`${rule.pathPrefix}/`)
}

export function classifyLinkSource(url?: string | null): LinkSource | null {
  if (!url) return null
  const host = hostnameOf(url)
  if (!host) return null
  if (GITHUB_HOSTS.has(host)) return 'github'
  const pathname = pathnameOf(url)
  if (DOCS_RULES.some(rule => matchesDocsRule(host, pathname, rule))) return 'docs'
  return null
}

function httpHttpsPrefixes(hostPath: string): string[] {
  return [`https://${hostPath}`, `http://${hostPath}`]
}

export function postgresUrlOrFilter(source: LinkSource): string {
  const parts: string[] = []
  const addHost = (host: string, pathPrefix?: string) => {
    if (pathPrefix) {
      for (const base of httpHttpsPrefixes(`${host}${pathPrefix}`)) {
        parts.push(`url.eq.${base}`)
        parts.push(`url.ilike.${base}%`)
      }
      return
    }
    for (const origin of httpHttpsPrefixes(host)) {
      parts.push(`url.eq.${origin}`)
      parts.push(`url.ilike.${origin}/%`)
    }
  }

  if (source === 'github') {
    for (const host of GITHUB_HOSTS) addHost(host)
  } else {
    for (const rule of DOCS_RULES) addHost(rule.host, rule.pathPrefix)
  }
  return parts.join(',')
}
