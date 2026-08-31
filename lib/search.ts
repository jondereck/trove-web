import type { SupabaseClient } from '@supabase/supabase-js'
import type { Collection, Save } from './types'
import { filterLibrarySaves } from './libraryCore'
import { rankSavesByTerms } from './searchMatch'
import { tokenizeSearchQuery } from './searchQuery'

const sanitizeFilterTerm = (w: string) => w.replace(/[,()%\\{}]/g, '')

function isMissingSearchRpc(error: { message?: string }): boolean {
  return /search_saves|Could not find the function|42883/.test(error.message ?? '')
}

export function searchLocalSaves(saves: Save[], query: string): Save[] {
  return rankSavesByTerms(filterLibrarySaves(saves), tokenizeSearchQuery(query))
}

export function searchLocalCollections(collections: Collection[], query: string): Collection[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return collections
    .filter(c => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)
}

export async function searchCloudSaves(supabase: SupabaseClient, query: string): Promise<Save[]> {
  const terms = tokenizeSearchQuery(query)
  if (!terms.length) return []

  const { data, error } = await supabase.rpc('search_saves', { terms })
  if (error && !isMissingSearchRpc(error)) throw error
  if (!error) {
    const ranked = rankSavesByTerms((data ?? []) as Save[], terms)
    if (ranked.length > 0) return ranked
  }

  let fallback = supabase
    .from('saves')
    .select('*')
    .eq('is_inbox', false)
    .order('created_at', { ascending: false })
    .limit(500)

  const withVault = await fallback.eq('is_vault', false)
  if (withVault.error && /is_vault/.test(withVault.error.message)) {
    const plain = await supabase
      .from('saves')
      .select('*')
      .eq('is_inbox', false)
      .order('created_at', { ascending: false })
      .limit(500)
    if (plain.error) throw plain.error
    return rankSavesByTerms(filterLibrarySaves((plain.data ?? []) as Save[]), terms)
  }

  if (withVault.error) throw withVault.error
  return rankSavesByTerms(filterLibrarySaves((withVault.data ?? []) as Save[]), terms)
}

export async function searchCloudCollections(
  supabase: SupabaseClient,
  query: string,
): Promise<Collection[]> {
  const q = sanitizeFilterTerm(query.trim().toLowerCase())
  if (!q) return []

  let request = supabase
    .from('collections')
    .select('*')
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .order('name')
    .limit(10)

  const withVault = await request.eq('is_vault', false)
  if (withVault.error && /is_vault/.test(withVault.error.message)) {
    const plain = await supabase
      .from('collections')
      .select('*')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order('name')
      .limit(10)
    if (plain.error) throw plain.error
    return (plain.data ?? []) as Collection[]
  }

  if (withVault.error) throw withVault.error
  return (withVault.data ?? []) as Collection[]
}
