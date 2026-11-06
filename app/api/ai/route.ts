import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY ?? ''
  if (!key) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  const body = await request.json().catch(() => null) as {
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
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: body.max_tokens ?? 512,
      messages: [
        ...(body.system ? [{ role: 'system', content: body.system }] : []),
        { role: 'user', content: body.user },
      ],
    }),
  })
  if (!response.ok) {
    return NextResponse.json({ error: `OpenAI ${response.status}` }, { status: 502 })
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return NextResponse.json({ content: data.choices?.[0]?.message?.content ?? '' })
}
