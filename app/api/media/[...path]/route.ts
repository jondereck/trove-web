import { NextResponse } from 'next/server'
import { neonPool } from '@/lib/neon/pool'

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const key = path.join('/')
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.includes('..')) {
    return NextResponse.json({ error: 'Bad path' }, { status: 400 })
  }
  const result = await neonPool().query(
    'select content_type, bytes from public.media_objects where path = $1',
    [key],
  )
  const row = result.rows[0] as { content_type: string; bytes: Buffer } | undefined
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(new Uint8Array(row.bytes), {
    headers: {
      'Content-Type': row.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
