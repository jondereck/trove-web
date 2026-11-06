import type { SupabaseClient } from '@supabase/supabase-js'
import { hashMcpToken, isMcpToken } from '@/lib/mcp/tokens'
import { createServiceClient } from '@/lib/mcp/serviceClient'
import { userFromSupabaseAccessToken } from '@/lib/mcp/supabaseAccessToken'

export type McpUser = {
  userId: string
  scopes: string[]
}

export async function resolveMcpUser(token: string | undefined): Promise<McpUser | null> {
  if (!token) return null
  if (process.env.DATABASE_URL) {
    const { readSession } = await import('@/lib/neon/accounts')
    const session = await readSession(token)
    if (session) return { userId: session.appUserId, scopes: ['trove:read'] }
    if (isMcpToken(token)) {
      const { neonPool } = await import('@/lib/neon/pool')
      const result = await neonPool().query(
        'select user_id, scopes from public.mcp_resolve_token($1)',
        [hashMcpToken(token)],
      )
      const row = result.rows[0] as { user_id?: string; scopes?: string[] } | undefined
      if (row?.user_id) return { userId: row.user_id, scopes: row.scopes ?? ['trove:read'] }
    }
  }
  const oauthUser = await userFromSupabaseAccessToken(token)
  if (oauthUser) return oauthUser
  if (!isMcpToken(token)) return null
  const supabase = createServiceClient()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('mcp_resolve_token', {
    p_token_hash: hashMcpToken(token),
  })
  if (error || !Array.isArray(data) || data.length === 0) return null
  const row = data[0] as { user_id?: string; scopes?: string[] }
  if (!row.user_id) return null
  return { userId: row.user_id, scopes: row.scopes ?? [] }
}

export async function readAsUser<T>(
  userId: string,
  fn: (supabase: SupabaseClient) => Promise<T>,
): Promise<T> {
  const supabase = createServiceClient()
  if (!supabase) throw new Error('MCP server is missing SUPABASE_SERVICE_ROLE_KEY')
  return fn(supabase)
}
