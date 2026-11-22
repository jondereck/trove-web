/**
 * Chat completions via Neon AI Gateway (OpenAI-compatible /v1).
 * Falls back to direct OpenAI when gateway env is unset (local/dev escape hatch).
 */

const DEFAULT_CHAT_MODEL = 'gpt-5-mini'

export type AiChatBody = {
  system?: string
  user: string
  max_tokens?: number
}

export function resolveAiChatConfig(): {
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

export async function runAiChatCompletion(
  body: AiChatBody,
): Promise<{ content: string } | { error: string; status: number }> {
  const cfg = resolveAiChatConfig()
  if (!cfg) {
    return {
      error: 'NEON_AI_GATEWAY_TOKEN / OPENAI_API_KEY not configured',
      status: 500,
    }
  }
  // gpt-5* often spends completion budget on hidden reasoning — keep a floor.
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
    return {
      error: `${label} ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`,
      status: 502,
    }
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return { content: data.choices?.[0]?.message?.content ?? '' }
}
