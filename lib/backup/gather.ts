import { getDemoLibrary } from '../demo'
import { fetchCloudCollections } from '../collections'
import { fetchCloudBackupSaves } from '../library'
import { readImport, readImportMedia } from '../importStore'
import {
  getImportSession,
  getSessionMode,
} from '../sessionMode'
import { createClient } from '../supabase/client'
import type { Collection, Save } from '../types'
import { mimeFromMediaName, parseMediaSentinel } from './media'
import {
  mapRecordsForExport,
  type BundledMedia,
  type ResolveLocalMedia,
} from './payload'

export type GatheredBackup = {
  saves: Save[]
  collections: Collection[]
  resolveLocalMedia?: ResolveLocalMedia
}

async function blobToMedia(name: string, blob: Blob): Promise<BundledMedia> {
  const buffer = await blob.arrayBuffer()
  return {
    name,
    bytes: new Uint8Array(buffer),
    mime: blob.type || mimeFromMediaName(name),
  }
}

function resolveFromMediaMap(media: Map<string, Blob>): ResolveLocalMedia {
  return async uri => {
    const name = parseMediaSentinel(uri)
    if (name) {
      const blob = media.get(name)
      if (!blob) return null
      return blobToMedia(name, blob)
    }
    if (uri.startsWith('blob:') || uri.startsWith('data:')) {
      try {
        const res = await fetch(uri)
        const blob = await res.blob()
        const subtype = blob.type.split('/')[1]?.split(';')[0] || 'bin'
        return blobToMedia(`web-${crypto.randomUUID()}.${subtype}`, blob)
      } catch {
        return null
      }
    }
    return null
  }
}

export async function gatherBackupRecords(): Promise<GatheredBackup> {
  const mode = getSessionMode()

  if (mode === 'import') {
    const session = getImportSession()
    if (session) {
      const record = await readImport(session.id, { hydrateMedia: false })
      if (record) {
        const media = await readImportMedia(session.id)
        return {
          saves: record.saves,
          collections: record.collections,
          resolveLocalMedia: resolveFromMediaMap(media),
        }
      }
    }
  }

  if (mode === 'demo') {
    const demo = getDemoLibrary()
    return { saves: demo.saves, collections: demo.collections }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { saves: [], collections: [] }
  }

  const [saves, collections] = await Promise.all([
    fetchCloudBackupSaves(supabase),
    fetchCloudCollections(supabase),
  ])
  return { saves, collections }
}

export async function buildExportArchive(gathered?: GatheredBackup) {
  const records = gathered ?? await gatherBackupRecords()
  return mapRecordsForExport(
    records.saves,
    records.collections,
    records.resolveLocalMedia,
  )
}
