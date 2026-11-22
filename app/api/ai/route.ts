import { NextResponse } from 'next/server'
import { runAiChatCompletion } from '@/lib/neon/aiGatewayChat'
import { proxyNeonFunction } from '@/lib/neon/functionProxy'

export async function POST(request: Request) {
  const proxied = await proxyNeonFunction('ai', request)
  if (proxied) return proxied

  const body = (await request.json().catch(() => null)) as {
    system?: string
    user?: string
    max_tokens?: number
    user_id?: string | null
    install_id?: string | null
  } | null
  if (!body?.user) return NextResponse.json({ error: 'Missing "user" prompt' }, { status: 400 })
  if (!body.user_id && !body.install_id) {
    return NextResponse.json({ error: 'Missing client id' }, { status: 400 })
  }
  const result = await runAiChatCompletion({
    system: body.system,
    user: body.user,
    max_tokens: body.max_tokens,
  })
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ content: result.content })
}
