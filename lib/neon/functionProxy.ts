/**
 * Optional reverse-proxy to a Neon Function URL.
 * When unset, callers run the local Vercel handler instead.
 */
/** Neon Function slugs are [a-z0-9]{1,20} — no hyphens. */
export function neonFunctionUrl(slug: string): string | null {
  const explicit = process.env[`NEON_FN_${slug.toUpperCase()}_URL`]
  if (explicit) return explicit.replace(/\/$/, '')
  const base = (process.env.NEON_FUNCTIONS_BASE_URL ?? '').replace(/\/$/, '')
  if (!base) return null
  return `${base}/${slug}`
}

export async function proxyNeonFunction(
  slug: string,
  request: Request,
  timeoutMs?: number,
): Promise<Response | null> {
  const target = neonFunctionUrl(slug)
  if (!target) return null
  const url = new URL(request.url)
  const dest = `${target}${url.search}`
  const headers = new Headers(request.headers)
  headers.delete('host')
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }
  const ctrl = timeoutMs ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  if (ctrl) init.signal = ctrl.signal
  try {
    return await fetch(dest, init)
  } finally {
    if (timer) clearTimeout(timer)
  }
}
