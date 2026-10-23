'use server'

import { createClient } from '@/lib/supabase/server'
import { generateMcpToken } from '@/lib/mcp/tokens'

export type McpTokenRow = {
  id: string
  label: string | null
  token_prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export async function listMcpTokens(): Promise<McpTokenRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trove_mcp_tokens')
    .select('id, label, token_prefix, created_at, last_used_at, revoked_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as McpTokenRow[]
}

export async function createMcpToken(label: string): Promise<{ token: string; prefix: string }> {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in required')

  const created = generateMcpToken()
  const cleanLabel = label.trim().slice(0, 60)
  const { error } = await supabase.from('trove_mcp_tokens').insert({
    user_id: userData.user.id,
    token_hash: created.tokenHash,
    token_prefix: created.tokenPrefix,
    label: cleanLabel || null,
    scopes: ['trove:read'],
  })
  if (error) throw new Error(error.message)
  return { token: created.token, prefix: created.tokenPrefix }
}

export async function revokeMcpToken(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('trove_mcp_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('revoked_at', null)
  if (error) throw new Error(error.message)
}
