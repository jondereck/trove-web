import { randomBytes } from 'node:crypto'
import { neonPool } from './pool'
import { neonAuthUrl } from './env'

export type AppSession = {
  token: string
  appUserId: string
  email: string
}

type NeonUser = { id: string; email: string; name?: string }

export async function linkAppUser(neonUser: NeonUser): Promise<string> {
  const email = neonUser.email.trim().toLowerCase()
  const pool = neonPool()
  const existing = await pool.query(
    'select id from public.users where lower(email) = $1 limit 1',
    [email],
  )
  let appUserId = existing.rows[0]?.id as string | undefined
  if (!appUserId) {
    const created = await pool.query(
      'insert into public.users (id, email, created_at) values (gen_random_uuid(), $1, now()) returning id',
      [email],
    )
    appUserId = created.rows[0].id as string
  }
  await pool.query(
    'delete from public.auth_links where email = $1 and neon_user_id <> $2::uuid',
    [email, neonUser.id],
  )
  await pool.query(
    `insert into public.auth_links (neon_user_id, app_user_id, email)
     values ($1::uuid, $2::uuid, $3)
     on conflict (neon_user_id) do update set app_user_id = excluded.app_user_id, email = excluded.email`,
    [neonUser.id, appUserId, email],
  )
  await pool.query(
    `insert into public.profiles (id) values ($1::uuid) on conflict (id) do nothing`,
    [appUserId],
  )
  return appUserId
}

export async function openSession(appUserId: string, email: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await neonPool().query(
    `insert into public.app_sessions (token, app_user_id, email, expires_at)
     values ($1, $2::uuid, $3, now() + interval '30 days')`,
    [token, appUserId, email.trim().toLowerCase()],
  )
  return token
}

export async function readSession(token: string | null | undefined): Promise<AppSession | null> {
  if (!token) return null
  const pool = neonPool()
  await pool.query('delete from public.app_sessions where expires_at < now()')
  const result = await pool.query(
    'select token, app_user_id, email from public.app_sessions where token = $1 and expires_at > now()',
    [token],
  )
  const row = result.rows[0] as { token: string; app_user_id: string; email: string } | undefined
  if (!row) return null
  return { token: row.token, appUserId: row.app_user_id, email: row.email }
}

export async function dropSession(token: string | null | undefined): Promise<void> {
  if (!token) return
  await neonPool().query('delete from public.app_sessions where token = $1', [token])
}

function readNeonUser(body: unknown): NeonUser | null {
  if (!body || typeof body !== 'object') return null
  const record = body as { user?: { id?: string; email?: string; name?: string } }
  const user = record.user
  if (!user?.id || !user.email) return null
  return { id: user.id, email: user.email, name: user.name }
}

export function authOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://web-trove.vercel.app').replace(/\/$/, '')
}

export async function openGoogleNonce(): Promise<string> {
  const nonce = randomBytes(18).toString('base64url')
  const pool = neonPool()
  await pool.query(
    `create table if not exists public.google_nonces (
      nonce text primary key,
      created_at timestamptz not null default now(),
      used_at timestamptz
    )`,
  )
  await pool.query('insert into public.google_nonces (nonce) values ($1)', [nonce])
  return nonce
}

export async function releasePasswordOnlyNeonUsers(): Promise<void> {
  const pool = neonPool()
  const ids = await pool.query(
    `select u.id
     from neon_auth."user" u
     join public.users p on lower(p.email) = lower(u.email)
     where not exists (
       select 1 from neon_auth.account a
       where a."userId" = u.id and a."providerId" = 'google'
     )`,
  )
  const userIds = ids.rows.map((row) => row.id as string)
  if (userIds.length === 0) return
  await pool.query('delete from neon_auth.session where "userId" = any($1::uuid[])', [userIds])
  await pool.query('delete from neon_auth.account where "userId" = any($1::uuid[])', [userIds])
  await pool.query('delete from neon_auth."user" where id = any($1::uuid[])', [userIds])
}

export async function claimNeonGoogleSession(request: Request, nonce: string): Promise<NeonUser | null> {
  const pool = neonPool()
  const marked = await pool.query(
    `update public.google_nonces
     set used_at = now()
     where nonce = $1 and used_at is null and created_at > now() - interval '10 minutes'
     returning created_at`,
    [nonce],
  )
  const startedAt = marked.rows[0]?.created_at as Date | undefined
  if (!startedAt) return null
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ?? ''
  const userAgent = request.headers.get('user-agent') ?? ''
  const found = await pool.query(
    `select u.id::text as id, u.email, u.name, s."ipAddress" as ip, s."userAgent" as agent
     from neon_auth.session s
     join neon_auth."user" u on u.id = s."userId"
     where s."createdAt" >= $1 and s."expiresAt" > now()
     order by s."createdAt" desc
     limit 5`,
    [startedAt],
  )
  const rows = found.rows as { id: string; email: string; name?: string; ip: string | null; agent: string | null }[]
  const tight = rows.filter((row) => (ip && row.ip === ip) || (userAgent && row.agent === userAgent))
  const chosen = rows.length === 1 ? rows[0] : tight.length === 1 ? tight[0] : null
  if (!chosen?.email) return null
  return { id: chosen.id, email: chosen.email, name: chosen.name }
}

export async function startNeonGoogle(callbackURL: string): Promise<{ url: string | null; error: string | null }> {
  const base = neonAuthUrl()
  if (!base) return { url: null, error: 'Neon Auth is not configured' }
  const origin = authOrigin()
  const response = await fetch(`${base}/sign-in/social`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Referer: `${origin}/`,
    },
    body: JSON.stringify({ provider: 'google', callbackURL }),
  })
  const payload = await response.json().catch(() => null) as { url?: string; message?: string } | null
  if (!response.ok || !payload?.url) {
    return { url: null, error: payload?.message ?? 'Could not start Google sign-in.' }
  }
  return { url: payload.url, error: null }
}

export async function userFromNeonSession(sessionToken: string): Promise<NeonUser | null> {
  const base = neonAuthUrl()
  if (!base || !sessionToken) return null
  const origin = authOrigin()
  const headersList: Record<string, string>[] = [
    { Authorization: `Bearer ${sessionToken}`, Origin: origin, Referer: `${origin}/` },
    { Cookie: `__Secure-neon-auth.session_token=${sessionToken}`, Origin: origin, Referer: `${origin}/` },
    { Cookie: `neon-auth.session_token=${sessionToken}`, Origin: origin, Referer: `${origin}/` },
  ]
  for (const headers of headersList) {
    const response = await fetch(`${base}/get-session`, { headers })
    if (!response.ok) continue
    const user = readNeonUser(await response.json().catch(() => null))
    if (user) return user
  }
  return null
}

export async function neonEmailAuth(
  path: 'sign-in/email' | 'sign-up/email' | 'request-password-reset',
  body: Record<string, unknown>,
): Promise<{ user: NeonUser | null; error: string | null }> {
  const base = neonAuthUrl()
  if (!base) return { user: null, error: 'Neon Auth is not configured' }
  const origin = authOrigin()
  const response = await fetch(`${base}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Referer: `${origin}/`,
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as { message: unknown }).message)
      : 'Sign-in failed'
    return { user: null, error: message }
  }
  return { user: readNeonUser(payload), error: null }
}
