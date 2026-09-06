'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
import FilterBar, { type LibraryViewMode } from '@/components/FilterBar'
import MoveToCollectionSheet from '@/components/MoveToCollectionSheet'
import SaveBrowseBody from '@/components/SaveBrowseBody'
import SelectionActionBar from '@/components/SelectionActionBar'
import SelectionModeHeader from '@/components/SelectionModeHeader'
import SelectionMoreMenu from '@/components/SelectionMoreMenu'
import TroveLoader from '@/components/TroveLoader'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePaginatedSaves } from '@/hooks/usePaginatedSaves'
import { useSaveSelection } from '@/hooks/useSaveSelection'
import { filterSavesForCollection, findCollectionById } from '@/lib/collections'
import type { LibraryFilter } from '@/lib/libraryFilters'
import { createClient } from '@/lib/supabase/client'
import { deleteSave, updateSave } from '@/lib/saves'
import { searchCloudSaves, searchLocalSaves } from '@/lib/search'
import { bulkReadAction, savesFromIds } from '@/lib/selectionMode'
import type { Save } from '@/lib/types'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './CollectionDetailPage.module.css'

type Props = {
  id: string
}

export default function CollectionDetailPage({ id }: Props) {
  const { loading: sessionLoading, error: sessionError, saves: localSaves, collections, mode, importFileName } =
    useLibrarySaves()
  const selection = useSaveSelection()
  const [moreOpen, setMoreOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery, 250)
  const [searchResults, setSearchResults] = useState<Save[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const localCollectionSaves = useMemo(
    () => (mode === 'cloud' ? [] : filterSavesForCollection(localSaves, id)),
    [mode, localSaves, id],
  )

  const collection = findCollectionById(collections, id)

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
    collectionId: mode === 'cloud' ? id : undefined,
    localSaves: localCollectionSaves,
    enabled:
      !sessionLoading &&
      !sessionError &&
      (mode === 'cloud' || !!collection) &&
      !debouncedSearch.trim(),
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
        let next: Save[]
        if (mode === 'cloud') {
          next = (await searchCloudSaves(createClient(), q)).filter(
            s => s.collection_id === id,
          )
        } else {
          next = searchLocalSaves(localCollectionSaves, q)
        }
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
  }, [debouncedSearch, mode, localCollectionSaves, sessionLoading, id])

  const displaySaves = searchResults ?? saves
  const isSearching = !!debouncedSearch.trim()

  const error = sessionError || pageError
  const showFullLoader =
    (sessionLoading && mode === 'cloud' && saves.length === 0 && !isSearching) ||
    (pageLoading && saves.length === 0 && !isSearching)
  const canEdit = mode === 'cloud'
  const selectedSaves = savesFromIds(displaySaves, selection.selectedIds)
  const hasSelection = selection.count > 0
  const readAction = bulkReadAction(selectedSaves)

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
      await Promise.all([...selection.selectedIds].map(sid => deleteSave(supabase, sid)))
      removeSaves(selection.selectedIds)
    })
  }

  const handleBulkMove = (collectionId: string) => {
    void runBulk(async () => {
      const supabase = createClient()
      await Promise.all(
        [...selection.selectedIds].map(sid =>
          updateSave(supabase, sid, { collection_id: collectionId, is_inbox: false }),
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

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      {selection.active ? (
        <SelectionModeHeader
          title={collection?.name ?? 'Collection'}
          itemTotal={isSearching ? displaySaves.length : total}
          count={selection.count}
          onSelectAll={() => selection.selectAll(displaySaves.map(s => s.id))}
          onCancel={selection.cancel}
        />
      ) : (
        <>
          <nav className={styles.breadcrumb}>
            <Link href="/collections">Collections</Link>
            <span aria-hidden>›</span>
            <span>{collection?.name ?? 'Collection'}</span>
          </nav>

          <header className={styles.header}>
            <p className={styles.kicker}>
              <span className={styles.kickerCount}>{total} SAVES</span>
            </p>
            <h1 className={`serif ${styles.title}`}>{collection?.name ?? 'Collection'}</h1>
            {collection?.description ? (
              <p className={styles.description}>{collection.description}</p>
            ) : null}
          </header>

          <div className={styles.filterBar}>
            <FilterBar
              filter={filter}
              onFilterChange={next => {
                selection.cancel()
                setFilter(next)
              }}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
          </div>
        </>
      )}

      {showFullLoader ? <TroveLoader label="Loading collection…" /> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!showFullLoader && !error && !collection && mode !== 'cloud' ? (
        <div className={styles.missing}>
          <p>Collection not found.</p>
          <Link href="/collections">Back to collections</Link>
        </div>
      ) : null}

      {!showFullLoader && !error && (collection || mode === 'cloud') ? (
        <div className={selection.active ? styles.selectionPad : undefined}>
          {searchLoading ? <TroveLoader label="Searching…" /> : null}
          {!searchLoading ? (
            <SaveBrowseBody
              saves={displaySaves}
              layout={viewMode}
              loadingMore={!isSearching && loadingMore}
              hasMore={!isSearching && hasMore}
              onLoadMore={loadMore}
              emptyTitle={isSearching ? 'No matches' : 'No saves in this collection yet.'}
              emptyHint={
                isSearching ? 'Try a different search.' : 'Add saves to this folder in Trove mobile.'
              }
              canEdit={canEdit}
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
                const text = selectedSaves
                  .map(s => [s.title, s.url].filter(Boolean).join('\n'))
                  .join('\n\n')
                void (navigator.share
                  ? navigator.share({ title: 'Trove saves', text })
                  : navigator.clipboard.writeText(text))
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
          {
            id: 'pin',
            label: 'Pin',
            icon: Pin,
            onPress: () => {
              void runBulk(async () => {
                const supabase = createClient()
                await Promise.all(
                  [...selection.selectedIds].map(sid => updateSave(supabase, sid, { is_pinned: true })),
                )
                patchSaves(selection.selectedIds, { is_pinned: true })
              })
            },
          },
          {
            id: 'unpin',
            label: 'Unpin',
            icon: PinOff,
            onPress: () => {
              void runBulk(async () => {
                const supabase = createClient()
                await Promise.all(
                  [...selection.selectedIds].map(sid => updateSave(supabase, sid, { is_pinned: false })),
                )
                patchSaves(selection.selectedIds, { is_pinned: false })
              })
            },
          },
          {
            id: 'favorite',
            label: 'Favorite',
            icon: Heart,
            onPress: () => {
              const anyUnfaved = selectedSaves.some(s => !s.is_favorite)
              void runBulk(async () => {
                const supabase = createClient()
                await Promise.all(
                  [...selection.selectedIds].map(sid =>
                    updateSave(supabase, sid, { is_favorite: anyUnfaved }),
                  ),
                )
                patchSaves(selection.selectedIds, { is_favorite: anyUnfaved })
              })
            },
          },
          {
            id: 'read',
            label: readAction.label,
            icon: readAction.is_viewed ? Eye : EyeOff,
            onPress: () => {
              void runBulk(async () => {
                const supabase = createClient()
                await Promise.all(
                  [...selection.selectedIds].map(sid =>
                    updateSave(supabase, sid, { is_viewed: readAction.is_viewed }, { bump: false }),
                  ),
                )
                patchSaves(selection.selectedIds, { is_viewed: readAction.is_viewed })
              })
            },
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
