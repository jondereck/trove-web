import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import { resolveMcpUser } from '@/lib/mcp/auth'
import { pingText } from '@/lib/mcp/ping'
import { createServiceClient, serviceRoleKey } from '@/lib/mcp/serviceClient'

type ToolExtra = {
  authInfo?: {
    extra?: { userId?: string }
    scopes?: string[]
  }
}

async function callMcp(fn: string, args: Record<string, unknown>, userId: string) {
  if (process.env.DATABASE_URL) {
    const { emptyState, runQuery } = await import('@/lib/neon/query')
    const { neonPool } = await import('@/lib/neon/pool')
    return runQuery((sql, params) => neonPool().query(sql, params), {
      ...emptyState('saves'),
      rpc: { fn, args },
    }, userId)
  }
  const supabase = createServiceClient()
  if (!supabase) return { data: null, error: { message: 'MCP server is missing SUPABASE_SERVICE_ROLE_KEY' }, count: null }
  const { data, error } = await supabase.rpc(fn, args)
  return { data, error: error ? { message: error.message } : null, count: null }
}
  function textResult(value: unknown, isError = false) {
  return {
    isError,
    content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value) }],
  }
}

function requireUser(extra: ToolExtra): string | { error: string } {
  if (!serviceRoleKey() && !process.env.DATABASE_URL) {
    return { error: 'MCP server is missing its database connection' }
  }
  const userId = extra.authInfo?.extra?.userId
  if (!userId) return { error: 'Sign in through your agent, or send Authorization: Bearer trove_sk_… from Settings → Agents & MCP' }
  if (!extra.authInfo?.scopes?.includes('trove:read')) return { error: 'This token does not have trove:read' }
  return userId
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'ping',
      {
        title: 'Ping',
        description: 'Hello check. Returns pong. Does not read your library.',
        inputSchema: { message: z.string().optional() },
      },
      async ({ message }) => textResult(pingText({ message })),
    )

    server.registerTool(
      'search_items',
      {
        title: 'Search items',
        description: 'Search your non-vault saves. Top 20.',
        inputSchema: {
          query: z.string().optional(),
          limit: z.number().int().min(1).max(20).optional(),
        },
      },
      async ({ query, limit }, extra: ToolExtra) => {
        const user = requireUser(extra)
        if (typeof user !== 'string') return textResult(user.error, true)
        const result = await callMcp('mcp_search_saves', {
          p_user_id: user,
          p_query: query ?? '',
          p_limit: limit ?? 20,
        }, user)
        if (result.error) return textResult(result.error.message, true)
        return textResult(result.data ?? [])
      },
    )

    server.registerTool(
      'get_item',
      {
        title: 'Get item',
        description: 'Read one non-vault save. Vault items are hidden.',
        inputSchema: { id: z.string().uuid() },
      },
      async ({ id }, extra: ToolExtra) => {
        const user = requireUser(extra)
        if (typeof user !== 'string') return textResult(user.error, true)
        const result = await callMcp('mcp_get_save', {
          p_user_id: user,
          p_save_id: id,
        }, user)
        if (result.error) return textResult(result.error.message, true)
        if (!result.data) return textResult('Save not found', true)
        return textResult(result.data)
      },
    )

    server.registerTool(
      'list_collections',
      {
        title: 'List collections',
        description: 'List your non-vault collections and how many saves are in each.',
        inputSchema: {},
      },
      async (_args, extra: ToolExtra) => {
        const user = requireUser(extra)
        if (typeof user !== 'string') return textResult(user.error, true)
        const result = await callMcp('mcp_list_collections', { p_user_id: user }, user)
        if (result.error) return textResult(result.error.message, true)
        return textResult(result.data ?? [])
      },
    )

    server.registerTool(
      'list_collection_items',
      {
        title: 'List collection items',
        description: 'List non-vault saves inside one collection, newest first. Up to 100. Vault collections return nothing.',
        inputSchema: {
          collection_id: z.string().uuid(),
          limit: z.number().int().min(1).max(100).optional(),
        },
      },
      async ({ collection_id, limit }, extra: ToolExtra) => {
        const user = requireUser(extra)
        if (typeof user !== 'string') return textResult(user.error, true)
        const result = await callMcp('mcp_list_collection_saves', {
          p_user_id: user,
          p_collection_id: collection_id,
          p_limit: limit ?? 100,
        }, user)
        if (result.error) return textResult(result.error.message, true)
        return textResult(result.data ?? [])
      },
    )

    server.registerTool(
      'list_reminders',
      {
        title: 'List reminders',
        description: 'List recent and upcoming reminders for non-vault saves.',
        inputSchema: {},
      },
      async (_args, extra: ToolExtra) => {
        const user = requireUser(extra)
        if (typeof user !== 'string') return textResult(user.error, true)
        const result = await callMcp('mcp_list_reminders', { p_user_id: user }, user)
        if (result.error) return textResult(result.error.message, true)
        return textResult(result.data ?? [])
      },
    )
  },
  { serverInfo: { name: 'trove-mcp', version: '0.1.0' } },
  { basePath: '/api', disableSse: true, maxDuration: 10 },
)

const authed = withMcpAuth(
  handler,
  async (_req, bearer) => {
    const user = await resolveMcpUser(bearer)
    if (!user) return undefined
    return {
      token: bearer ?? '',
      clientId: user.userId,
      scopes: user.scopes,
      extra: { userId: user.userId },
    }
  },
  { required: true, resourceMetadataPath: '/.well-known/oauth-protected-resource' },
)

export const maxDuration = 10

export { authed as GET, authed as POST, authed as DELETE }
