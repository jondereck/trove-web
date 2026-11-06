export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? ''
}

export function neonAuthUrl(): string {
  return (process.env.NEON_AUTH_URL ?? '').replace(/\/$/, '')
}

export function isNeonConfigured(): boolean {
  return Boolean(databaseUrl())
}

export const SESSION_COOKIE = 'trove_session'
