'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
  Search,
} from 'lucide-react'
import type { LibraryFilter } from '@/lib/types'
import styles from './FilterBar.module.css'

export type LibraryViewMode = 'grid' | 'list'

type MenuOption = { id: LibraryFilter | 'all-time'; label: string }

const STATUS_OPTIONS: MenuOption[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'fav', label: 'Favorites' },
  { id: 'reminders', label: 'Reminders' },
]

const TYPE_OPTIONS: MenuOption[] = [
  { id: 'all', label: 'All types' },
  { id: 'link', label: 'Links' },
  { id: 'note', label: 'Notes' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'tracker', label: 'Trackers' },
  { id: 'github', label: 'GitHub' },
  { id: 'docs', label: 'Docs' },
]

const DATE_OPTIONS: MenuOption[] = [
  { id: 'all-time', label: 'Any time' },
]

type Props = {
  filter: LibraryFilter
  onFilterChange: (filter: LibraryFilter) => void
  viewMode?: LibraryViewMode
  onViewModeChange?: (mode: LibraryViewMode) => void
  showViewToggle?: boolean
  onAddNew?: () => void
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
}

function statusLabel(filter: LibraryFilter): string {
  return STATUS_OPTIONS.find(o => o.id === filter)?.label
    ?? (TYPE_OPTIONS.some(o => o.id === filter) ? 'All' : 'All')
}

function typeLabel(filter: LibraryFilter): string {
  const hit = TYPE_OPTIONS.find(o => o.id === filter && o.id !== 'all')
  return hit?.label ?? 'Type'
}

function FilterMenu({
  label,
  options,
  activeId,
  onPick,
}: {
  label: string
  options: MenuOption[]
  activeId: string
  onPick: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className={styles.menuWrap} ref={ref}>
      <button
        type="button"
        className={styles.menuBtn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(v => !v)}
      >
        <span>{label}</span>
        <ChevronDown size={14} strokeWidth={2} />
      </button>
      {open ? (
        <ul id={menuId} className={styles.menu} role="listbox">
          {options.map(opt => (
            <li key={opt.id}>
              <button
                type="button"
                role="option"
                aria-selected={activeId === opt.id}
                className={activeId === opt.id ? styles.menuItemActive : styles.menuItem}
                onClick={() => {
                  onPick(opt.id)
                  setOpen(false)
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default function FilterBar({
  filter,
  onFilterChange,
  viewMode = 'grid',
  onViewModeChange,
  showViewToggle = true,
  onAddNew,
  searchQuery = '',
  onSearchQueryChange,
}: Props) {
  const isTypeFilter = TYPE_OPTIONS.some(o => o.id === filter && o.id !== 'all')

  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <Search size={16} strokeWidth={1.75} aria-hidden className={styles.searchIcon} />
        <input
          type="search"
          value={searchQuery}
          onChange={e => onSearchQueryChange?.(e.target.value)}
          placeholder="Search notes, links, images, and more…"
          aria-label="Search library"
        />
      </div>

      <div className={styles.filters}>
        <FilterMenu
          label={statusLabel(filter)}
          options={STATUS_OPTIONS}
          activeId={isTypeFilter ? 'all' : filter}
          onPick={id => onFilterChange(id as LibraryFilter)}
        />
        <FilterMenu
          label={typeLabel(filter)}
          options={TYPE_OPTIONS}
          activeId={isTypeFilter ? filter : 'all'}
          onPick={id => onFilterChange((id === 'all' ? 'all' : id) as LibraryFilter)}
        />
        <FilterMenu
          label="Date added"
          options={DATE_OPTIONS}
          activeId="all-time"
          onPick={() => {}}
        />
      </div>

      {showViewToggle && onViewModeChange ? (
        <button
          type="button"
          className={styles.viewToggle}
          aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
        >
          {viewMode === 'grid' ? <List size={16} strokeWidth={1.75} /> : <LayoutGrid size={16} strokeWidth={1.75} />}
        </button>
      ) : null}

      <button
        type="button"
        className={styles.addBtn}
        onClick={() => {
          if (onAddNew) onAddNew()
          else window.dispatchEvent(new Event('trove:open-quick-save'))
        }}
      >
        <Plus size={16} strokeWidth={2.25} />
        Add new
      </button>
    </div>
  )
}
