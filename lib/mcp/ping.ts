export type PingArgs = {
  message?: string
}

/** Phase 0 spike reply. No vault, no user data. */
export function pingText(args: PingArgs = {}): string {
  const message = args.message?.trim()
  return message ? `pong: ${message}` : 'pong'
}
