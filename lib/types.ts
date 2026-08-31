export type SaveType = 'link' | 'image' | 'video' | 'note' | 'tracker'

export type TrackerTimeUnit = 'day' | 'week' | 'month' | 'year'

export interface TrackerMetric {
  label: string
  unit: string
}

export type TrackerRule =
  | {
      kind: 'interval'
      time?: { every: number; unit: TrackerTimeUnit }
      metric?: { every: number }
      combine?: 'first' | 'all'
      autoLog?: boolean
    }
  | { kind: 'deadline'; dueAt: string; leadDays?: number }

export interface TrackerRecord {
  id: string
  at: string
  metricValue?: number
  label?: string
  note?: string
}

export interface TrackerData {
  metric?: TrackerMetric
  rule?: TrackerRule
  calendarView?: boolean
  records: TrackerRecord[]
}

export type EditorFont = 'serif' | 'sans'
export type EditorHeading = 'h1' | 'h2' | 'body'

export type FieldFormat = {
  heading?: EditorHeading
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export type SaveEditorStyle = {
  paperColor?: string | null
  titleFormat?: FieldFormat
  bodyFormat?: FieldFormat
  titleColor?: string
  titleFont?: EditorFont
  bodyColor?: string
  bodyFont?: EditorFont
}

export type CollectionCoverSlot =
  | { kind: 'image'; url: string; domain?: string }
  | { kind: 'brand'; domain: string }
  | { kind: 'note'; title: string; preview: string }

export type LibraryFilter =
  | 'all'
  | 'unread'
  | 'fav'
  | 'reminders'
  | SaveType
  | 'github'
  | 'docs'

export interface Save {
  id: string
  user_id: string
  url?: string
  title: string
  description?: string
  type: SaveType
  content?: string
  image_url?: string
  image_urls?: string[]
  collection_id?: string
  tags: string[]
  is_inbox: boolean
  is_favorite?: boolean
  is_pinned?: boolean
  is_viewed?: boolean
  is_watched?: boolean
  watched_at?: string | null
  is_vault?: boolean
  vault_ciphertext?: string | null
  vault_iv?: string | null
  editor_style?: SaveEditorStyle | null
  tracker?: TrackerData
  view_count?: number
  reaction_count?: number
  created_at: string
  updated_at?: string
}

export type SaveUpdate = Omit<
  Partial<Omit<Save, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
  'image_url' | 'image_urls'
> & {
  image_url?: string | null
  image_urls?: string[] | null
}

export interface Collection {
  id: string
  user_id: string
  name: string
  icon?: string
  color?: string
  description?: string
  cover_image_url?: string | null
  is_pinned?: boolean
  watchlist_mode?: 'auto' | 'on' | 'off'
  auto_move_keywords?: string | null
  is_vault?: boolean
  created_at: string
  save_count?: number
  cover_urls?: string[]
  cover_slots?: CollectionCoverSlot[]
}

export type BackupPayload = {
  version: number
  exportedAt: string
  saves: Save[]
  collections: Collection[]
}

export type SavesPageResult = {
  saves: Save[]
  total: number
}

export type LibraryStats = {
  total: number
  notes: number
  links: number
}

export interface OGMetadata {
  url: string
  title: string
  description?: string
  image?: string
  siteName?: string
  viewCount?: number
  reactionCount?: number
}

export type { StoredSaveReminder, SaveReminderStore } from './saveRemindersCore'
