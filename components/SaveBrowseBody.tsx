'use client'

import type { Save } from '@/lib/types'
import type { LibraryViewMode } from '@/components/FilterBar'
import SaveGrid from '@/components/SaveGrid'
import TroveLoader from '@/components/TroveLoader'
import { partitionPinnedSaves } from '@/lib/libraryFilters'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import styles from './SaveBrowseBody.module.css'

type Props = {
  saves: Save[]
  layout: LibraryViewMode
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  showPinned?: boolean
  emptyTitle?: string
  emptyHint?: string
  canEdit?: boolean
}

export default function SaveBrowseBody({
  saves,
  layout,
  loadingMore,
  hasMore,
  onLoadMore,
  showPinned = true,
  emptyTitle,
  emptyHint,
  canEdit = false,
}: Props) {
  const { pinned, rest } = partitionPinnedSaves(saves)
  const hasPinned = showPinned && pinned.length > 0

  const sentinelRef = useInfiniteScroll({
    enabled: hasMore,
    hasMore,
    loading: loadingMore,
    onLoadMore,
  })

  if (saves.length === 0) {
    return (
      <SaveGrid
        saves={[]}
        layout={layout}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
        canEdit={canEdit}
      />
    )
  }

  return (
    <>
      {hasPinned ? (
        <SaveGrid
          saves={pinned}
          layout={layout}
          title="PINNED"
          titleTone="accent"
          canEdit={canEdit}
        />
      ) : null}

      {hasPinned ? (
        rest.length > 0 ? (
          <SaveGrid saves={rest} layout={layout} title="ALL SAVES" canEdit={canEdit} />
        ) : null
      ) : (
        <SaveGrid saves={saves} layout={layout} canEdit={canEdit} />
      )}

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
      {loadingMore ? <TroveLoader compact label="Loading more…" /> : null}
    </>
  )
}
