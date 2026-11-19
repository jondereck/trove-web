import { NextResponse } from 'next/server'
import { neonPool } from '@/lib/neon/pool'
import { readSession } from '@/lib/neon/accounts'

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

/**
 * Signed-in actions ported from the Supabase edge function:
 *   { action: 'attach_viewer', token }         — claim a public share link
 *   { action: 'accept_invite', invite_token }  — accept an email invite
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const session = await readSession(auth.slice(7))
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    action?: string
    token?: string
    invite_token?: string
  } | null
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const email = session.email.trim().toLowerCase()
  const userId = session.appUserId
  const pool = neonPool()

  try {
    if (body.action === 'attach_viewer') {
      const token = body.token ?? ''
      if (!TOKEN_RE.test(token)) {
        return NextResponse.json({ error: 'unavailable' }, { status: 404 })
      }
      const res = await pool.query(
        `with s as (
           select collection_id, owner_id from public.collection_shares
           where token = $1 and link_enabled = true
         ), c as (
           select s.collection_id, s.owner_id from s
           join public.collections col on col.id = s.collection_id
           where coalesce(col.is_vault, false) = false
         )
         insert into public.collection_share_members
           (collection_id, owner_id, email, user_id, role, status, updated_at)
         select collection_id, owner_id, $2::text, $3::uuid, 'viewer', 'accepted', now() from c
         on conflict (collection_id, email) do update set
           user_id = excluded.user_id,
           role = case
             when public.collection_share_members.role = 'editor' then 'editor'
             else 'viewer'
           end,
           status = 'accepted',
           updated_at = now()
         returning role, status`,
        [token, email, userId],
      )
      const row = res.rows[0] as { role: string; status: string } | undefined
      if (!row) return NextResponse.json({ error: 'unavailable' }, { status: 404 })
      return NextResponse.json({ ok: true, role: row.role, status: 'accepted' })
    }

    if (body.action === 'accept_invite') {
      const inviteToken = body.invite_token ?? ''
      if (!TOKEN_RE.test(inviteToken)) {
        return NextResponse.json({ error: 'unavailable' }, { status: 404 })
      }
      const found = await pool.query(
        `select id, email, role from public.collection_share_members
         where invite_token = $1 and status = 'pending'`,
        [inviteToken],
      )
      const member = found.rows[0] as { id: string; email: string; role: string } | undefined
      if (!member) return NextResponse.json({ error: 'unavailable' }, { status: 404 })
      if (member.email.trim().toLowerCase() !== email) {
        return NextResponse.json({ error: 'email_mismatch' }, { status: 403 })
      }
      await pool.query(
        `update public.collection_share_members
         set user_id = $2::uuid, status = 'accepted', updated_at = now()
         where id = $1`,
        [member.id, userId],
      )
      return NextResponse.json({ ok: true, role: member.role, status: 'accepted' })
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch {
    // Opaque, like the edge function — no collection titles or SQL in errors.
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
