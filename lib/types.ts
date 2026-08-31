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
  created_at: string
}

export type BackupPayload = {
  version: number
  exportedAt: string
  saves: Save[]
  collections: Collection[]
}
