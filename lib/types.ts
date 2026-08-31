export type CollectionCoverSlot =
  | { kind: 'image'; url: string; domain?: string }
  | { kind: 'brand'; domain: string }
  | { kind: 'note'; title: string; preview: string }

export type SaveType = 'link' | 'image' | 'video' | 'note' | 'tracker'

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
  is_vault?: boolean
  created_at: string
  updated_at?: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  icon?: string
  color?: string
  description?: string
  cover_image_url?: string | null
  created_at: string
  save_count?: number
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
