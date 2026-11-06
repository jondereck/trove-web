import { NextResponse } from 'next/server'
import { neonPool } from '@/lib/neon/pool'

const TOKEN_RE = /^[A-Za-z0-9_-]{22,128}$/

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'unavailable' }, { status: 404 })
  const pool = neonPool()
  const share = await pool.query(
    `select collection_id, owner_id from public.collection_shares
     where token = $1 and link_enabled = true`,
    [token],
  )
  const shareRow = share.rows[0] as { collection_id: string; owner_id: string } | undefined
  if (!shareRow) return NextResponse.json({ error: 'unavailable' }, { status: 404 })
  const collection = await pool.query(
    `select id, name, description, icon, color, cover_image_url, is_vault
     from public.collections where id = $1`,
    [shareRow.collection_id],
  )
  const folder = collection.rows[0] as {
    id: string
    name: string
    description: string | null
    icon: string
    color: string
    cover_image_url: string | null
    is_vault: boolean
  } | undefined
  if (!folder || folder.is_vault) return NextResponse.json({ error: 'unavailable' }, { status: 404 })
  const saves = await pool.query(
    `select id, title, description, type, url, image_url, tags, created_at
     from public.saves
     where collection_id = $1 and is_vault = false
     order by created_at desc`,
    [folder.id],
  )
  const profile = await pool.query(
    'select first_name, last_name, avatar_url from public.profiles where id = $1',
    [shareRow.owner_id],
  )
  const person = profile.rows[0] as { first_name?: string; last_name?: string; avatar_url?: string } | undefined
  const display = [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Account'
  return NextResponse.json({
    collection: {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      icon: folder.icon,
      color: folder.color,
      cover_image_url: folder.cover_image_url,
    },
    saves: saves.rows,
    owner: { display_name: display, avatar_url: person?.avatar_url ?? null },
  })
}
