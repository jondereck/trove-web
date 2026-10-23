import { createClient } from '@supabase/supabase-js'
import { supabaseUrl } from '@/lib/env'

export function serviceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
}

export function createServiceClient() {
  const key = serviceRoleKey()
  const url = supabaseUrl()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
