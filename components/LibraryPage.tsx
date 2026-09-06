'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Ellipsis,
  Eye,
  EyeOff,
  FolderOpen,
  FolderPlus,
  Heart,
  Pin,
  PinOff,
  Share2,
  Tag,
  Trash2,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import BulkEditTagsSheet from '@/components/BulkEditTagsSheet'
import DemoBanner from '@/components/DemoBanner'
import type { LibraryViewMode } from '@/components/FilterBar'
import LibraryHeader from '@/components/LibraryHeader'
import MoveToCollectionSheet from '@/components/MoveToCollectionSheet'
import SaveBrowseBody from '@/components/SaveBrowseBody'
import SelectionActionBar from '@/components/SelectionActionBar'
import SelectionModeHeader from '@/components/SelectionModeHeader'
import SelectionMoreMenu from '@/components/SelectionMoreMenu'
import TroveLoader from '@/components/TroveLoader'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePaginatedSaves } from '@/hooks/usePaginatedSaves'
import { useSaveSelection } from '@/hooks/useSaveSelection'
import { greetingForHour } from '@/lib/greeting'
import { consumeLibraryFilterIntent } from '@/lib/libraryFilterIntent'
import { libraryHref, parseLibraryFilterParam } from '@/lib/libraryFilterUrl'
import type { LibraryFilter } from '@/lib/libraryFilters'
import { fetchCloudLibraryStats } from '@/lib/library'
import { createClient } from '@/lib/supabase/client'
import { countsByType } from '@/lib/libraryCore'
import { searchCloudSaves, searchLocalSaves } from '@/lib/search'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import { playSuccess } from '@/lib/sounds'
import { deleteSave, updateSave } from '@/lib/saves'
import { bulkReadAction, savesFromIds } from '@/lib/selectionMode'
import type { LibraryStats, Save } from '@/lib/types'
import styles from './LibraryPage.module.css'

export default function LibraryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: sessionLoading, error: sessionError, saves: localSaves, mode, importFileName, firstName } =
    useLibrarySaves()
  const selection = useSaveSelection()
  const [moreOpen, setMoreOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (searchParams.get('signed_in') !== '1') return
    playSuccess()
    router.replace('/library')
  }, [router, searchParams])

  const hour = new Date().getHours()
  const urlFilter = parseLibraryFilterParam(searchParams.get('filter'))
  const [filter, setFilter] = useState<LibraryFilter>(urlFilter ?? 'all')
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery, 250)
  const [searchResults, setSearchResults] = useState<Save[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    if (urlFilter) {
      setFilter(urlFilter)
      return
    }
    if (searchParams.get('filter') == null) {
      const intent = consumeLibraryFilterIntent()
      if (intent) {
        setFilter(intent)
        if (intent !== 'all') router.replace(libraryHref(intent))
      }
    }
  }, [urlFilter, searchParams, router])

  const handleFilterChange = (next: LibraryFilter) => {
    selection.cancel()
    setFilter(next)
    router.replace(libraryHref(next))
  }

  const {
    saves,
    total,
    loading: pageLoading,
    loadingMore,
    error: pageError,
    loadMore,
    hasMore,
    removeSaves,
    patchSaves,
  } = usePaginatedSaves({
    mode,
    filter,
    localSaves,
    enabled: !sessionLoading && !sessionError && !debouncedSearch.trim(),
  })

  useEffect(() => {
    const q = debouncedSearch.trim()
    if (!q) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }
    if (sessionLoading) return

    let cancelled = false
    setSearchLoading(true)
    void (async () => {
      try {
        const next =
          mode === 'cloud'
            ? await searchCloudSaves(createClient(), q)
            : searchLocalSaves(localSaves, q)
        if (!cancelled) setSearchResults(next)
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, mode, localSaves, sessionLoading])

  const displaySaves = searchResults ?? saves
  const isSearching = !!debouncedSearch.trim()

  const [stats, setStats] = useState<LibraryStats | null>(null)

  useEffect(() => {
    if (sessionLoading || sessionError) return
    if (mode === 'cloud') {
      const supabase = createClient()
      fetchCloudLibraryStats(supabase)
        .then(setStats)
        .catch(() => setStats(null))
      return
    }
    const localStats = countsByType(localSaves)
    setStats({ total: localStats.total, notes: localStats.notes, links: localStats.links })
  }, [sessionLoading, sessionError, mode, localSaves])

  const error = sessionError || pageError
  const showFullLoader =
    !isSearching &&
    ((sessionLoading && mode === 'cloud' && saves.length === 0) ||
      (pageLoading && saves.length === 0))
  const saveTotal = stats?.total ?? total
  const canEdit = mode === 'cloud'
  const selectedSaves = savesFromIds(displaySaves, selection.selectedIds)
  const hasSelection = selection.count > 0
  const readAction = bulkReadAction(selectedSaves)

  const emptyCopy = useMemo(() => {
    if (isSearching) {
      return { title: 'No matches', hint: 'Try a different search.' }
    }
    if (filter === 'all') {
      return {
        title: 'Nothing saved yet',
        hint: 'Save links, notes, and images in Trove mobile.',
      }
    }
    if (filter === 'unread') {
      return { title: 'All caught up', hint: 'Every item in your library has been opened at least once.' }
    }
    if (filter === 'reminders') {
      return { title: 'No upcoming reminders', hint: 'Saves with an active reminder will show up here.' }
    }
    return { title: 'No matches', hint: 'Try a different filter or save something new.' }
  }, [filter, isSearching])

  const runBulk = async (fn: () => Promise<void>) => {
    if (!canEdit || busy || !hasSelection) return
    setBusy(true)
    try {
      await fn()
      selection.cancel()
      setMoreOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const handleBulkDelete = () => {
    if (
      !window.confirm(
        `Delete ${selection.count} ${selection.count === 1 ? 'save' : 'saves'}? This cannot be undone.`,
      )
    ) {
      return
    }
    void runBulk(async () => {
      const supabase = createClient()
      await Promise.all([...selection.selectedIds].map(id => deleteSave(supabase, id)))
      removeSaves(selection.selectedIds)
    })
  }

  const handleBulkMove = (collectionId: string) => {
    void runBulk(async () => {
      const supabase = createClient()
      await Promise.all(
        [...selection.selectedIds].map(id =>
          updateSave(supabase, id, { collection_id: collectionId, is_inbox: false }),
        ),
      )
      removeSaves(selection.selectedIds)
    })
  }

  const handleBulkAddTags = (tags: string[]) => {
    void runBulk(async () => {
      const supabase = createClient()
      await Promise.all(
        selectedSaves.map(save => {
          const merged = [...new Set([...(save.tags ?? []), ...tags])]
          return updateSave(supabase, save.id, { tags: merged })
        }),
      )
      for (const save of selectedSaves) {
        const merged = [...new Set([...(save.tags ?? []), ...tags])]
        patchSaves(new Set([save.id]), { tags: merged })
      }
    })
  }

  const handleBulkFavorite = () => {
    const anyUnfaved = selectedSaves.some(s => !s.is_favorite)
    void runBulk(async () => {
      const supabase = createClient()
      await Promise.all(
        [...selection.selectedIds].map(id => updateSave(supabase, id, { is_favorite: anyUnfaved })),
      )
      patchSaves(selection.selectedIds, { is_favorite: anyUnfaved })
    })
  }

  const handleBulkPin = (pinned: boolean) => {
    void runBulk(async () => {
      const supabase = createClient()
      await Promise.all(
        [...selection.selectedIds].map(id => updateSave(supabase, id, { is_pinned: pinned })),
      )
      patchSaves(selection.selectedIds, { is_pinned: pinned })
    })
  }

  const handleBulkRead = () => {
    void runBulk(async () => {
      const supabase = createClient()
      await Promise.all(
        [...selection.selectedIds].map(id =>
          updateSave(supabase, id, { is_viewed: readAction.is_viewed }, { bump: false }),
        ),
      )
      patchSaves(selection.selectedIds, { is_viewed: readAction.is_viewed })
    })
  }

  const handleBulkShare = async () => {
    if (!hasSelection) return
    const text = selectedSaves
      .map(s => [s.title, s.url].filter(Boolean).join('\n'))
      .join('\n\n')
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Trove saves', text })
      } else {
        await navigator.clipboard.writeText(text)
        window.alert('Copied selected saves to clipboard.')
      }
    } catch {
      // user cancelled share
    }
  }

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      {selection.active ? (
        <SelectionModeHeader
          count={selection.count}
          itemTotal={isSearching ? displaySaves.length : saveTotal}
          onSelectAll={() => selection.selectAll(displaySaves.map(s => s.id))}
          onCancel={selection.cancel}
        />
      ) : (
        <LibraryHeader
          greeting={`${greetingForHour(hour, firstName)}.`}
          saveTotal={saveTotal}
          filter={filter}
          onFilterChange={handleFilterChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      )}

      {showFullLoader ? <TroveLoader label="Loading library…" /> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!showFullLoader && !error ? (
        <div className={selection.active ? styles.selectionPad : undefined}>
          {searchLoading ? <TroveLoader label="Searching…" /> : null}
          {!searchLoading ? (
            <SaveBrowseBody
              saves={displaySaves}
              layout={viewMode}
              loadingMore={!isSearching && loadingMore}
              hasMore={!isSearching && hasMore}
              onLoadMore={loadMore}
              emptyTitle={emptyCopy.title}
              emptyHint={emptyCopy.hint}
              canEdit={canEdit}
              fromFilter={filter}
              selectionActive={selection.active}
              selectedIds={selection.selectedIds}
              onToggleSelect={selection.toggle}
              onEnterSelection={canEdit ? selection.enter : undefined}
            />
          ) : null}
        </div>
      ) : null}

      {selection.active ? (
        <SelectionActionBar
          inactive={!hasSelection || busy}
          selectedCount={selection.count}
          actions={[
            { id: 'move', label: 'Move', icon: FolderOpen, onPress: () => setMoveOpen(true) },
            {
              id: 'share',
              label: 'Share',
              icon: Share2,
              onPress: () => {
                void handleBulkShare()
              },
            },
            {
              id: 'add',
              label: 'Add to collection',
              icon: FolderPlus,
              onPress: () => setAddOpen(true),
            },
            {
              id: 'tags',
              label: 'Edit tags',
              icon: Tag,
              onPress: () => setTagsOpen(true),
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: Trash2,
              onPress: handleBulkDelete,
              destructive: true,
            },
            {
              id: 'more',
              label: 'More',
              icon: Ellipsis,
              onPress: () => setMoreOpen(true),
            },
          ]}
        />
      ) : null}

      <SelectionMoreMenu
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={[
          { id: 'pin', label: 'Pin', icon: Pin, onPress: () => handleBulkPin(true) },
          { id: 'unpin', label: 'Unpin', icon: PinOff, onPress: () => handleBulkPin(false) },
          { id: 'favorite', label: 'Favorite', icon: Heart, onPress: handleBulkFavorite },
          {
            id: 'read',
            label: readAction.label,
            icon: readAction.is_viewed ? Eye : EyeOff,
            onPress: handleBulkRead,
          },
        ]}
      />

      <MoveToCollectionSheet
        visible={moveOpen}
        title="Move to"
        onClose={() => setMoveOpen(false)}
        onSelect={handleBulkMove}
      />
      <MoveToCollectionSheet
        visible={addOpen}
        title="Add to collection"
        onClose={() => setAddOpen(false)}
        onSelect={handleBulkMove}
      />
      <BulkEditTagsSheet
        visible={tagsOpen}
        count={selection.count}
        onClose={() => setTagsOpen(false)}
        onApply={handleBulkAddTags}
      />
    </AppShell>
  )
}
