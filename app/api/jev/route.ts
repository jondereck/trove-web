import { NextResponse } from 'next/server'
import { runJevSystemOne } from '@/lib/neon/aiGatewayDecisions'
import { proxyNeonFunction } from '@/lib/neon/functionProxy'

export async function POST(request: Request) {
  const proxied = await proxyNeonFunction('jev', request)
  if (proxied) return proxied

  const body = (await request.json().catch(() => null)) as {
    model?: string
    state?: unknown
    questions?: Record<string, unknown>
    user_id?: string | null
    install_id?: string | null
  } | null
  if (!body?.state || !body.questions || typeof body.questions !== 'object') {
    return NextResponse.json({ error: 'Missing state/questions' }, { status: 400 })
  }
  if (!body.user_id && !body.install_id) {
    return NextResponse.json({ error: 'Missing client id' }, { status: 400 })
  }
  const result = await runJevSystemOne({
    model: body.model,
    state: body.state,
    questions: body.questions,
    user_id: body.user_id,
    install_id: body.install_id,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data)
}
