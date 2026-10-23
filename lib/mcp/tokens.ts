import { createHash, randomBytes } from 'node:crypto'

const TOKEN_PREFIX = 'trove_sk_'
const PREFIX_TAIL = 8

export function hashMcpToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateMcpToken(): { token: string; tokenHash: string; tokenPrefix: string } {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
  return {
    token,
    tokenHash: hashMcpToken(token),
    tokenPrefix: token.slice(0, TOKEN_PREFIX.length + PREFIX_TAIL),
  }
}

export function isMcpToken(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX) && token.length >= TOKEN_PREFIX.length + 32
}
