export type DataBackend = 'neon' | 'supabase'

type Env = Record<string, string | undefined>

/** Live store. Unset and unknown values stay on Neon so a typo cannot select Supabase. */
export function dataBackend(env: Env = process.env): DataBackend {
  const raw = (env.NEXT_PUBLIC_DATA_BACKEND ?? '').trim().toLowerCase()
  if (raw === 'supabase') return 'supabase'
  return 'neon'
}

export function isNeonDataBackend(env: Env = process.env): boolean {
  return dataBackend(env) === 'neon'
}

/**
 * Opt-in Neon → Supabase (PG17) writes. Off unless SUPABASE_MIRROR is 1, true, or yes.
 * Service-role keys alone do not turn the mirror on.
 */
export function supabaseMirrorEnabled(env: Env = process.env): boolean {
  const raw = (env.SUPABASE_MIRROR ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}
