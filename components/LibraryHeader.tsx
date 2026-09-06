'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import NotificationsMenu from '@/components/NotificationsMenu'
import { weekdayLabel } from '@/lib/greeting'
import type { LibraryFilter } from '@/lib/types'
import FilterBar, { type LibraryViewMode } from '@/components/FilterBar'
import styles from './LibraryHeader.module.css'

type Props = {
  greeting: string
  saveTotal: number
  filter: LibraryFilter
  onFilterChange: (filter: LibraryFilter) => void
  viewMode: LibraryViewMode
  onViewModeChange: (mode: LibraryViewMode) => void
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  showFilters?: boolean
  settingsHref?: string
}

export default function LibraryHeader({
  greeting,
  saveTotal,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  showFilters = true,
  settingsHref = '/settings',
}: Props) {
  const [dateLabel, setDateLabel] = useState('')
  useEffect(() => {
    setDateLabel(weekdayLabel())
  }, [])

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div>
          <h1 className={`serif ${styles.greeting}`}>{greeting}</h1>
          <p className={styles.kicker}>
            <span className={styles.kickerCount}>{saveTotal} SAVED</span>
            <span className={styles.kickerSep}> • </span>
            <span className={styles.kickerDate}>{dateLabel}</span>
          </p>
        </div>
        <div className={styles.actions}>
          <NotificationsMenu />
          <Link href={settingsHref} className={styles.iconBtn} aria-label="Settings">
            <Settings size={18} />
          </Link>
        </div>
      </div>

      {showFilters ? (
        <FilterBar
          filter={filter}
          onFilterChange={onFilterChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
        />
      ) : null}
    </header>
  )
}
