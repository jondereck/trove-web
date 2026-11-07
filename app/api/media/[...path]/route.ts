import { NextResponse } from 'next/server'
import { neonPool } from '@/lib/neon/pool'
import { publicMediaUrl } from '@/lib/neon/storage'

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const key = path.join('/')
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.includes('..')) {
    return NextResponse.json({ error: 'Bad path' }, { status: 400 })
  }

  // Never stream object bytes through Vercel. Public Neon Object Storage holds the file.
  const direct = publicMediaUrl(key)
  if (direct) {
    return NextResponse.redirect(direct, 302)
  }

  const result = await neonPool().query(
    'select content_type, bytes from public.media_objects where path = $1',
    [key],
  )
  const row = result.rows[0] as { content_type: string; bytes: Buffer } | undefined
  if (!row || row.bytes.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(new Uint8Array(row.bytes), {
    headers: {
      'Content-Type': row.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
