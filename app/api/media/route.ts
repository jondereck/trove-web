import { NextResponse } from 'next/server'
import { neonUserId } from '@/lib/neon/client'
import { neonPool } from '@/lib/neon/pool'

export async function POST(request: Request) {
  const userId = await neonUserId(request)
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const path = request.headers.get('x-media-path') ?? ''
  if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.includes('..')) {
    return NextResponse.json({ error: 'Bad path' }, { status: 400 })
  }
  const bytes = Buffer.from(await request.arrayBuffer())
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File is empty or too large' }, { status: 400 })
  }
  const contentType = request.headers.get('content-type') ?? 'application/octet-stream'
  await neonPool().query(
    `insert into public.media_objects (path, content_type, bytes, user_id)
     values ($1, $2, $3, $4::uuid)
     on conflict (path) do update set content_type = excluded.content_type, bytes = excluded.bytes`,
    [path, contentType, bytes, userId],
  )
  return NextResponse.json({ path })
}
