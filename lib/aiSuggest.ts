import type { Collection, OGMetadata } from './types'
import { supabaseAnonKey, supabaseUrl } from './env'

export type AISuggestion = {
  collection: string
  tags: string[]
}

const ORGANIZE_SYSTEM = `You are the AI organizing assistant for Trove, a personal curation app.
Analyze saved items and suggest collections and tags to help the user find things later.

RULES:
- Suggest exactly ONE collection per item (use existing ones when they fit, or suggest a new 1-4 word title-cased name)
- Suggest 2-3 lowercase tags, no # symbol, hyphens for multi-word (e.g. "machine-learning")
- Avoid generic tags like "interesting", "good", "saved", "to-read"
- Never create generic collections like "Misc", "Other", "Links"

RESPONSE FORMAT — JSON only, no markdown, no explanation:
- Single item: {"collection": "Name", "tags": ["tag1", "tag2"]}`

function parseJSON<T>(text: string, fallback: T): T {
  const trimmed = text.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return fallback
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as T
  } catch {
    return fallback
  }
}

export function parseOrganizeSuggestion(text: string): AISuggestion {
  const json = parseJSON<{ collection?: string; tags?: string[] }>(text, {})
  const tags = Array.isArray(json.tags)
    ? [...new Set(json.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 3)
    : []
  const collection = (json.collection ?? '').trim() || 'Read Later'
  return { collection, tags }
}

export function matchSuggestedCollectionName(
  name: string | undefined,
  collections: Pick<Collection, 'name'>[],
): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return 'Read Later'
  const match = collections.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
  return match?.name ?? trimmed
}

export function buildSuggestForSavePrompt(
  metadata: Pick<OGMetadata, 'title' | 'url' | 'description'>,
  collectionNames: string[],
): string {
  const colList = collectionNames.join(', ') || 'none yet'
  return `Item to organize:
Title: ${metadata.title}
URL: ${metadata.url || 'n/a'}
Description: ${metadata.description ?? 'none'}

Available collections: ${colList}

JSON only: {"collection": "Name", "tags": ["tag1", "tag2", "tag3"]}`
}

function webInstallId(): string {
  if (typeof window === 'undefined') return 'trove-web-ssr'
  const key = 'trove.web.install_id'
  try {
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    window.localStorage.setItem(key, id)
    return id
  } catch {
    return 'trove-web-anon'
  }
}

export async function callAiProxy(input: {
  system?: string
  user: string
  userId?: string | null
  maxTokens?: number
}): Promise<string> {
  const url = supabaseUrl().trim()
  const anon = supabaseAnonKey().trim()
  if (!url || !anon) throw new Error('Supabase is not configured.')

  const res = await fetch(`${url}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify({
      system: input.system,
      user: input.user,
      max_tokens: input.maxTokens ?? 512,
      user_id: input.userId ?? null,
      install_id: webInstallId(),
    }),
  })

  const body = await res.json().catch(() => ({})) as { content?: string; error?: string }
  if (res.status === 429) throw new Error('AI limit reached for this month. Save still works without suggestions.')
  if (!res.ok) throw new Error(body.error || `AI proxy ${res.status}`)
  return body.content ?? ''
}

export async function suggestForSave(
  metadata: Pick<OGMetadata, 'title' | 'url' | 'description'>,
  collections: Pick<Collection, 'name'>[],
  opts?: { userId?: string | null },
): Promise<AISuggestion> {
  const text = await callAiProxy({
    system: ORGANIZE_SYSTEM,
    user: buildSuggestForSavePrompt(
      metadata,
      collections.map(c => c.name),
    ),
    userId: opts?.userId,
  })
  const parsed = parseOrganizeSuggestion(text)
  return {
    collection: matchSuggestedCollectionName(parsed.collection, collections),
    tags: parsed.tags,
  }
}

const NOTE_TITLE_SYSTEM = `Suggest a short note title (max 8 words). No quotes. Return plain text only.`

export async function suggestNoteTitle(
  content: string,
  opts?: { userId?: string | null },
): Promise<string> {
  const trimmed = content.trim()
  if (!trimmed) return ''
  const text = await callAiProxy({
    system: NOTE_TITLE_SYSTEM,
    user: `Note:\n${trimmed.slice(0, 2000)}\n\nTitle:`,
    userId: opts?.userId,
    maxTokens: 32,
  })
  return text.trim().replace(/^["']|["']$/g, '').slice(0, 80)
}
