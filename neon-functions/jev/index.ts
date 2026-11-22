const DEFAULT_JEV_MODEL = 'typesafeai-jev-1-14-0'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'POST only' }, { status: 405 })
    }
    const gwBase = (process.env.NEON_AI_GATEWAY_BASE_URL ?? '').replace(/\/$/, '')
    const gwToken = process.env.NEON_AI_GATEWAY_TOKEN ?? ''
    if (!gwBase || !gwToken) {
      return Response.json({ error: 'NEON_AI_GATEWAY_TOKEN not configured' }, { status: 500 })
    }
    const body = (await request.json().catch(() => null)) as {
      model?: string
      state?: unknown
      questions?: Record<string, unknown>
      user_id?: string | null
      install_id?: string | null
    } | null
    if (!body?.state || !body.questions || typeof body.questions !== 'object') {
      return Response.json({ error: 'Missing state/questions' }, { status: 400 })
    }
    if (!body.user_id && !body.install_id) {
      return Response.json({ error: 'Missing client id' }, { status: 400 })
    }
    const model =
      (body.model ?? process.env.AI_JEV_MODEL ?? DEFAULT_JEV_MODEL).trim() || DEFAULT_JEV_MODEL
    const response = await fetch(`${gwBase}/typesafe/v1/systemone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gwToken}`,
      },
      body: JSON.stringify({
        model,
        state: body.state,
        questions: body.questions,
      }),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return Response.json(
        { error: `Jev ${response.status}${text ? `: ${text.slice(0, 160)}` : ''}` },
        { status: 502 },
      )
    }
    return Response.json(await response.json())
  },
}
