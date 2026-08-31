import type { SupabaseClient } from '@supabase/supabase-js'

let pinColumnsAvailable: boolean | null = null

export function missingPinColumn(error: { message?: string } | null): boolean {
  return !!error?.message?.includes('is_pinned')
}

export async function hasPinColumns(supabase: SupabaseClient): Promise<boolean> {
  if (pinColumnsAvailable !== null) return pinColumnsAvailable
  const { error } = await supabase.from('collections').select('is_pinned').limit(1)
  if (error && missingPinColumn(error)) {
    pinColumnsAvailable = false
    return false
  }
  pinColumnsAvailable = !error
  return pinColumnsAvailable
}

export function markPinColumnsUnavailable(): void {
  pinColumnsAvailable = false
}
