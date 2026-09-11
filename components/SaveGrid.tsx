'use client'

import Link from 'next/link'
import { Pin } from 'lucide-react'
import type { LibraryFilter, Save } from '@/lib/types'
import type { LibraryViewMode } from '@/components/FilterBar'
import SaveCard from './SaveCard'
import styles from './SaveGrid.module.css'

type SelectionProps = {
  selectedIds?: ReadonlySet<string>
  selectionActive?: boolean
  onToggleSelect?: (id: string) => void
  onEnterSelection?: (id: string) => void
}

type Props = {
  saves: Save[]
  layout?: LibraryViewMode
  title?: string
  titleTone?: 'muted' | 'accent'
  viewAllHref?: string
  emptyTitle?: string
  emptyHint?: string
  canEdit?: boolean
  disableLink?: boolean
  fromFilter?: LibraryFilter
} & SelectionProps

function CardGrid({
  saves,
  compact = false,
  canEdit = false,
  disableLink = false,
  fromFilter,
  selectionActive,
  selectedIds,
  onToggleSelect,
  onEnterSelection,
}: {
  saves: Save[]
  compact?: boolean
  canEdit?: boolean
  disableLink?: boolean
  fromFilter?: LibraryFilter
} & SelectionProps) {
  return (
    <div className={styles.grid}>
      {saves.map(save => (
        <SaveCard
          key={save.id}
          save={save}
          compact={compact}
          canEdit={canEdit}
          disableLink={disableLink}
          fromFilter={fromFilter}
          selected={selectionActive ? selectedIds?.has(save.id) : undefined}
          onToggleSelect={onToggleSelect}
          onEnterSelection={onEnterSelection}
        />
      ))}
    </div>
  )
}

export default function SaveGrid({
  saves,
  layout = 'grid',
  title,
  titleTone = 'muted',
  viewAllHref,
  emptyTitle = 'No saves in your library yet.',
  emptyHint = 'Save items in Trove mobile, or try the demo on the sign-in page.',
  canEdit = false,
  disableLink = false,
  fromFilter,
  selectionActive,
  selectedIds,
  onToggleSelect,
  onEnterSelection,
}: Props) {
  if (saves.length === 0 && !title) {
    return (
      <div className={styles.empty}>
        <p>{emptyTitle}</p>
        <span>{emptyHint}</span>
      </div>
    )
  }

  const selection = {
    selectionActive,
    selectedIds,
    onToggleSelect,
    onEnterSelection,
  }

  return (
    <section className={styles.section}>
      {title ? (
        <div className={styles.sectionHead}>
          <h2
            className={
              titleTone === 'accent' ? styles.sectionTitleAccent : styles.sectionTitle
            }
          >
            {titleTone === 'accent' ? (
              <Pin size={12} strokeWidth={2.25} aria-hidden className={styles.sectionPin} />
            ) : null}
            {title}
          </h2>
          {viewAllHref ? <Link href={viewAllHref} className={styles.viewAll}>View all</Link> : null}
        </div>
      ) : null}

      {saves.length === 0 ? (
        <div className={styles.emptyInline}>No saves in this section.</div>
      ) : layout === 'list' ? (
        <div className={styles.list}>
          {saves.map(save => (
            <SaveCard
              key={save.id}
              save={save}
              layout="list"
              canEdit={canEdit}
              disableLink={disableLink}
              fromFilter={fromFilter}
              selected={selectionActive ? selectedIds?.has(save.id) : undefined}
              onToggleSelect={onToggleSelect}
              onEnterSelection={onEnterSelection}
            />
          ))}
        </div>
      ) : (
        <CardGrid
          saves={saves}
          compact={titleTone === 'accent'}
          canEdit={canEdit}
          disableLink={disableLink}
          fromFilter={fromFilter}
          {...selection}
        />
      )}
    </section>
  )
}
