import { supabaseUrl } from '@/lib/env'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type JwtPayload = {
  sub?: string
  iss?: string
  exp?: number
  scope?: string
}

type Jwk = JsonWebKey & { kid?: string; alg?: string }

let cachedKeys: { expires: number; keys: Jwk[] } | null = null

export function isSupabaseAccessJwt(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0) && token.startsWith('eyJ')
}

export function readScopes(payload: JwtPayload): string[] {
  const scopes = typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : []
  if (!scopes.includes('trove:read')) scopes.push('trove:read')
  return scopes
}

export function acceptPayload(payload: JwtPayload, issuer: string, now = Date.now()): string | null {
  if (!payload.sub || !UUID.test(payload.sub)) return null
  if (payload.iss !== issuer) return null
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= now) return null
  return payload.sub
}

function issuer(): string {
  return `${supabaseUrl().replace(/\/$/, '')}/auth/v1`
}

function bytes(value: string): Uint8Array<ArrayBuffer> {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4))
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + pad
  const source = Buffer.from(b64, 'base64')
  const copy = new Uint8Array(source.byteLength)
  copy.set(source)
  return copy
}

async function keys(): Promise<Jwk[]> {
  if (cachedKeys && cachedKeys.expires > Date.now()) return cachedKeys.keys
  const response = await fetch(`${issuer()}/.well-known/jwks.json`)
  if (!response.ok) return []
  const body = (await response.json()) as { keys?: Jwk[] }
  cachedKeys = { expires: Date.now() + 10 * 60 * 1000, keys: body.keys ?? [] }
  return cachedKeys.keys
}

export async function userFromSupabaseAccessToken(
  token: string,
): Promise<{ userId: string; scopes: string[] } | null> {
  if (!isSupabaseAccessJwt(token)) return null
  const [headerPart, payloadPart, signaturePart] = token.split('.')
  let header: { kid?: string; alg?: string }
  let payload: JwtPayload
  try {
    header = JSON.parse(Buffer.from(bytes(headerPart)).toString('utf8'))
    payload = JSON.parse(Buffer.from(bytes(payloadPart)).toString('utf8'))
  } catch {
    return null
  }
  if (header.alg !== 'ES256') return null
  const jwk = (await keys()).find((key) => key.kid === header.kid && key.kty === 'EC')
  if (!jwk) return null
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    bytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  )
  if (!valid) return null
  const userId = acceptPayload(payload, issuer())
  if (!userId) return null
  return { userId, scopes: readScopes(payload) }
}
