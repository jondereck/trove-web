/**
 * Phase 0 token-path check. Prints counts and algorithms only — never tokens or keys.
 *
 * Minted HS256 path runs when SUPABASE_JWT_SECRET and TROVE_RLS_USER_ID are set.
 * Otherwise it signs in anonymously (if the project allows it) and checks RLS
 * with that GoTrue user JWT.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { mintUserJwt } from '../lib/mcp/mintUserJwt'

function loadEnvFile(path: string) {
  try {
    const text = readFileSync(path, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!match || process.env[match[1]]) continue
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  } catch {
    // optional
  }
}

loadEnvFile('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.log('RESULT blocked missing_supabase_env')
  process.exit(2)
}

function clientWithToken(token: string): SupabaseClient {
  return createClient(url!, anonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function jwtAlg(token: string): string {
  const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')) as { alg?: string }
  return header.alg ?? 'unknown'
}

async function countOwnProfiles(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from('profiles').select('id').eq('id', userId)
  if (error) return { error: error.code ?? error.message, count: -1 }
  return { error: null as string | null, count: data?.length ?? 0 }
}

async function proveToken(label: string, token: string, userId: string) {
  const authed = clientWithToken(token)
  const anon = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const own = await countOwnProfiles(authed, userId)
  const other = await countOwnProfiles(anon, userId)
  const inserted = await authed
    .from('saves')
    .insert({
      user_id: userId,
      title: 'mcp-phase0-rls-probe',
      type: 'note',
      content: 'phase0',
      tags: [],
      is_inbox: true,
      is_favorite: false,
      is_viewed: false,
      is_pinned: false,
      image_urls: [],
      is_watched: false,
      is_vault: false,
    })
    .select('id')
  const saveId = inserted.data?.[0]?.id as string | undefined
  let ownSave = -1
  let anonSave = -1
  if (saveId) {
    const seen = await authed.from('saves').select('id').eq('id', saveId)
    const hidden = await anon.from('saves').select('id').eq('id', saveId)
    ownSave = seen.data?.length ?? 0
    anonSave = hidden.data?.length ?? 0
    await authed.from('saves').delete().eq('id', saveId)
  }
  console.log(
    JSON.stringify({
      label,
      alg: jwtAlg(token),
      userId,
      profile: own,
      anonProfile: other,
      insertError: inserted.error ? inserted.error.code ?? inserted.error.message : null,
      ownSave,
      anonSave,
    }),
  )
  const pass = own.count === 1 && other.count === 0 && ownSave === 1 && anonSave === 0
  return pass
}

async function main() {
  const secret = process.env.SUPABASE_JWT_SECRET
  const userId = process.env.TROVE_RLS_USER_ID
  if (secret && userId) {
    const token = mintUserJwt({
      userId,
      secret,
      issuer: `${url}/auth/v1`,
    })
    const pass = await proveToken('minted', token, userId)
    console.log(pass ? 'RESULT pass minted' : 'RESULT fail minted')
    process.exit(pass ? 0 : 1)
  }

  const auth = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const signed = await auth.auth.signInAnonymously()
  if (signed.error || !signed.data.session || !signed.data.user) {
    console.log(
      JSON.stringify({
        label: 'anonymous',
        ok: false,
        error: signed.error?.message ?? 'no session',
        minted: 'blocked_no_jwt_secret',
      }),
    )
    console.log('RESULT blocked')
    process.exit(2)
  }

  const pass = await proveToken('gotrue-user-jwt', signed.data.session.access_token, signed.data.user.id)
  console.log('CLEANUP_USER', signed.data.user.id)
  console.log(pass ? 'RESULT pass gotrue-user-jwt' : 'RESULT fail gotrue-user-jwt')
  console.log('RESULT minted blocked_no_jwt_secret')
  process.exit(pass ? 0 : 1)
}

main().catch((error: unknown) => {
  console.log('RESULT error', error instanceof Error ? error.message : 'unknown')
  process.exit(1)
})
