import { neonPool } from './pool'

const TABLES = [
  { name: 'profiles', pk: 'id' },
  { name: 'collections', pk: 'id' },
  { name: 'saves', pk: 'id' },
  { name: 'vault_meta', pk: 'user_id' },
  { name: 'save_reminders', pk: 'id' },
  { name: 'collection_shares', pk: 'id' },
  { name: 'collection_share_members', pk: 'id' },
  { name: 'daily_tasks', pk: 'user_id' },
  { name: 'trove_mcp_tokens', pk: 'id' },
] as const

export async function copyNeonToSupabase(): Promise<Record<string, number>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase backup target is not configured')
  const pool = neonPool()
  const counts: Record<string, number> = {}
  for (const table of TABLES) {
    const result = await pool.query(`select * from public.${table.name}`)
    counts[table.name] = result.rowCount ?? result.rows.length
    if (result.rows.length === 0) continue
    const response = await fetch(`${supabaseUrl}/rest/v1/${table.name}?on_conflict=${table.pk}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(result.rows),
    })
    if (!response.ok) {
      throw new Error(`${table.name} backup failed: ${response.status}`)
    }
  }
  return counts
}
