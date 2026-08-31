'use client'

import {
  Bell,
  BookOpen,
  FileText,
  Code2,
  ImageIcon,
  LayoutGrid,
  Link2,
  List,
  Mail,
  Star,
  Timer,
  Video,
} from 'lucide-react'
import type { LibraryFilter } from '@/lib/types'
import { visibleLibraryFilterChips } from '@/lib/libraryFilterChips'
import styles from './FilterBar.module.css'

const CHIP_ICONS: Partial<Record<LibraryFilter, React.ReactNode>> = {
  unread: <Mail size={14} />,
  fav: <Star size={14} />,
  reminders: <Bell size={14} />,
  link: <Link2 size={14} />,
  github: <Code2 size={14} />,
  docs: <BookOpen size={14} />,
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  note: <FileText size={14} />,
  tracker: <Timer size={14} />,
}

export type LibraryViewMode = 'grid' | 'list'

type Props = {
  filter: LibraryFilter
  onFilterChange: (filter: LibraryFilter) => void
  viewMode?: LibraryViewMode
  onViewModeChange?: (mode: LibraryViewMode) => void
  showViewToggle?: boolean
}

export default function FilterBar({
  filter,
  onFilterChange,
  viewMode = 'grid',
  onViewModeChange,
  showViewToggle = true,
}: Props) {
  const chips = visibleLibraryFilterChips()

  return (
    <div className={styles.bar}>
      <div className={styles.chips} role="tablist" aria-label="Filter saves">
        {chips.map(chip => (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={filter === chip.id}
            className={filter === chip.id ? styles.chipActive : styles.chip}
            onClick={() => onFilterChange(chip.id)}
          >
            {CHIP_ICONS[chip.id] ? (
              <span className={styles.chipIcon}>{CHIP_ICONS[chip.id]}</span>
            ) : null}
            {chip.label}
          </button>
        ))}
      </div>

      {showViewToggle && onViewModeChange ? (
        <button
          type="button"
          className={styles.viewToggle}
          aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
        >
          {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
        </button>
      ) : null}
    </div>
  )
}
