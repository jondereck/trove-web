/**
 * TypeSafe System One (Jev) via Neon AI Gateway Decisions API.
 */

export type JevProxyBody = {
  model?: string
  state: unknown
  questions: Record<string, unknown>
  user_id?: string | null
  install_id?: string | null
}

export function resolveDecisionsConfig(): {
  url: string
  apiKey: string
} | null {
  const gwBase = (process.env.NEON_AI_GATEWAY_BASE_URL ?? '').replace(/\/$/, '')
  const gwToken = process.env.NEON_AI_GATEWAY_TOKEN ?? ''
  if (!gwBase || !gwToken) return null
  return {
    url: `${gwBase}/typesafe/v1/systemone`,
    apiKey: gwToken,
  }
}

export async function runJevSystemOne(
  body: JevProxyBody,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number }> {
  const cfg = resolveDecisionsConfig()
  if (!cfg) {
    return { ok: false, error: 'NEON_AI_GATEWAY_TOKEN not configured', status: 500 }
  }
  const model =
    (body.model ?? process.env.AI_JEV_MODEL ?? 'typesafeai-jev-1-14-0').trim() ||
    'typesafeai-jev-1-14-0'
  const response = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model,
      state: body.state,
      questions: body.questions,
    }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    return {
      ok: false,
      error: `Jev ${response.status}${text ? `: ${text.slice(0, 160)}` : ''}`,
      status: 502,
    }
  }
  return { ok: true, data: await response.json() }
}
