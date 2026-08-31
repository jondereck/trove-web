'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import CollectionCard from '@/components/CollectionCard'
import DemoBanner from '@/components/DemoBanner'
import TroveLoader from '@/components/TroveLoader'
import SaveList from '@/components/SaveList'
import { attachSaveCounts } from '@/lib/collections'
import { createClient } from '@/lib/supabase/client'
import {
  searchCloudCollections,
  searchCloudSaves,
  searchLocalCollections,
  searchLocalSaves,
} from '@/lib/search'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './SearchPage.module.css'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export default function SearchPage() {
  const { loading: sessionLoading, error: sessionError, saves, collections, mode, importFileName, firstName } =
    useLibrarySaves()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [results, setResults] = useState<{ saves: typeof saves; collections: typeof collections }>({
    saves: [],
    collections: [],
  })

  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) {
      setResults({ saves: [], collections: [] })
      setSearchError('')
      setSearchLoading(false)
      return
    }

    if (sessionLoading) return

    let cancelled = false

    async function runSearch() {
      setSearchLoading(true)
      setSearchError('')

      try {
        if (mode === 'cloud') {
          const supabase = createClient()
          const [saveResults, collectionResults] = await Promise.all([
            searchCloudSaves(supabase, q),
            searchCloudCollections(supabase, q),
          ])
          if (!cancelled) {
            setResults({
              saves: saveResults,
              collections: attachSaveCounts(collectionResults, saveResults),
            })
          }
        } else {
          if (!cancelled) {
            setResults({
              saves: searchLocalSaves(saves, q),
              collections: attachSaveCounts(
                searchLocalCollections(collections, q),
                saves,
              ),
            })
          }
        }
      } catch (e) {
        if (!cancelled) {
          setSearchError(e instanceof Error ? e.message : 'Search failed.')
          setResults({ saves: [], collections: [] })
        }
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }

    runSearch()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, sessionLoading, mode, saves, collections])

  const hasQuery = query.trim().length > 0
  const showEmpty = hasQuery && !searchLoading && !searchError
    && results.saves.length === 0 && results.collections.length === 0

  const hint = useMemo(() => {
    if (mode === 'demo') return 'Search within the demo library'
    if (mode === 'import') return 'Search within your imported file'
    return 'Search your Trove Cloud library'
  }, [mode])

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <h1 className={`serif ${styles.title}`}>Search</h1>
      <p className={styles.subtitle}>{hint}</p>

      <label className={styles.searchBox}>
        <span className={styles.searchIcon} aria-hidden>⌕</span>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search saves, tags, collections…"
          autoFocus
        />
        <span className={styles.shortcut}>Ctrl+K</span>
      </label>

      {sessionError ? <p className={styles.error}>{sessionError}</p> : null}
      {searchError ? <p className={styles.error}>{searchError}</p> : null}
      {searchLoading ? <TroveLoader compact label="Searching…" /> : null}

      {showEmpty ? (
        <div className={styles.empty}>
          <p>No matches for &ldquo;{query.trim()}&rdquo;</p>
          <span>Try a tag, title keyword, or collection name.</span>
        </div>
      ) : null}

      {!searchLoading && results.collections.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Collections</h2>
            <span>{results.collections.length}</span>
          </div>
          <div className={styles.card}>
            {results.collections.map(collection => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      ) : null}

      {!searchLoading && results.saves.length > 0 ? (
        <section className={styles.section}>
          <SaveList saves={results.saves} />
        </section>
      ) : null}

      {!hasQuery ? (
        <p className={styles.prompt}>Type to search titles, tags, notes, and collection names.</p>
      ) : null}
    </AppShell>
  )
}
