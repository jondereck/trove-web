import { createHmac } from 'node:crypto'

export type MintUserJwtOptions = {
  userId: string
  secret: string
  /** Unix seconds. Defaults to now. */
  now?: number
  /** Defaults to 300 (about five minutes). */
  expiresInSeconds?: number
  /** Supabase Auth issuer, usually `${url}/auth/v1`. */
  issuer?: string
}

function base64url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

/**
 * Mint a short-lived Supabase-compatible HS256 user JWT.
 * The legacy JWT secret stays in server memory; this never uses the service role.
 */
export function mintUserJwt(options: MintUserJwtOptions): string {
  const now = options.now ?? Math.floor(Date.now() / 1000)
  const expiresInSeconds = options.expiresInSeconds ?? 300
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const claims: Record<string, unknown> = {
    aud: 'authenticated',
    role: 'authenticated',
    sub: options.userId,
    iat: now,
    exp: now + expiresInSeconds,
  }
  if (options.issuer) claims.iss = options.issuer
  const body = base64url(JSON.stringify(claims))
  const data = `${header}.${body}`
  const signature = createHmac('sha256', options.secret).update(data).digest('base64url')
  return `${data}.${signature}`
}
