const DEFAULT_CHAT_MODEL = 'gpt-5-mini'

function resolveChatConfig(): {
  url: string
  apiKey: string
  model: string
  via: 'neon-gateway' | 'openai'
} | null {
  const model = (process.env.AI_CHAT_MODEL ?? DEFAULT_CHAT_MODEL).trim() || DEFAULT_CHAT_MODEL
  const gwBase = (process.env.NEON_AI_GATEWAY_BASE_URL ?? '').replace(/\/$/, '')
  const gwToken = process.env.NEON_AI_GATEWAY_TOKEN ?? ''
  if (gwBase && gwToken) {
    return {
      url: `${gwBase}/v1/chat/completions`,
      apiKey: gwToken,
      model,
      via: 'neon-gateway',
    }
  }
  const openaiKey = process.env.OPENAI_API_KEY ?? ''
  if (openaiKey) {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: openaiKey,
      model: process.env.AI_CHAT_MODEL?.trim() || 'gpt-4o-mini',
      via: 'openai',
    }
  }
  return null
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'POST only' }, { status: 405 })
    }
    const cfg = resolveChatConfig()
    if (!cfg) {
      return Response.json(
        { error: 'NEON_AI_GATEWAY_TOKEN / OPENAI_API_KEY not configured' },
        { status: 500 },
      )
    }
    const body = (await request.json().catch(() => null)) as {
      system?: string
      user?: string
      max_tokens?: number
      user_id?: string | null
      install_id?: string | null
      action?: string
    } | null
    if (!body?.user) return Response.json({ error: 'Missing "user" prompt' }, { status: 400 })
    if (!body.user_id && !body.install_id) {
      return Response.json({ error: 'Missing client id' }, { status: 400 })
    }
    const requested = body.max_tokens ?? 512
    const maxOut = /^gpt-5/i.test(cfg.model) ? Math.max(requested, 256) : requested
    const tokenField = /^gpt-5/i.test(cfg.model)
      ? { max_completion_tokens: maxOut }
      : { max_tokens: maxOut }
    const response = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        ...tokenField,
        messages: [
          ...(body.system ? [{ role: 'system', content: body.system }] : []),
          { role: 'user', content: body.user },
        ],
      }),
    })
    if (!response.ok) {
      const label = cfg.via === 'neon-gateway' ? 'AI Gateway' : 'OpenAI'
      const detail = await response.text().catch(() => '')
      return Response.json(
        {
          error: `${label} ${response.status}`,
          model: cfg.model,
          via: cfg.via,
          detail: detail.slice(0, 400),
        },
        { status: 502 },
      )
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return Response.json({ content: data.choices?.[0]?.message?.content ?? '' })
  },
}
