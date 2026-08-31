export const SEARCH_STOPWORDS = new Set([
  'the', 'that', 'this', 'from', 'last', 'ideas', 'idea', 'saved', 'save', 'my',
  'everything', 'all', 'in', 'me', 'and', 'for', 'with', 'about', 'show',
])

export function tokenizeSearchQuery(query: string): string[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const words = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !SEARCH_STOPWORDS.has(w))
  return words.length ? words : [trimmed.toLowerCase()]
}
