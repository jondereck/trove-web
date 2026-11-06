import type { BackupPayload, Collection, Save } from '../types'
import { excludeVaultSaves } from '../libraryCore'
import { mediaSentinel, parseMediaSentinel, shouldBundleWebMedia } from './media'

export const BACKUP_VERSION = 2

export type BundledMedia = {
  name: string
  bytes: Uint8Array
  mime?: string
}

export type ResolveLocalMedia = (uri: string) => Promise<BundledMedia | null>

export function backupZipFilename(timestampMs = Date.now()): string {
  return `trove-backup-${timestampMs}.zip`
}

function stripCollectionForExport(collection: Collection): Collection {
  const {
    save_count: _count,
    cover_urls: _covers,
    cover_slots: _slots,
    ...rest
  } = collection
  return rest
}

export async function mapRecordsForExport(
  saves: Save[],
  collections: Collection[],
  resolveLocalMedia?: ResolveLocalMedia,
  exportedAt = new Date().toISOString(),
): Promise<{ payload: BackupPayload; media: BundledMedia[] }> {
  const bundled = new Map<string, BundledMedia>()
  let generated = 0

  const bundleUri = async (uri?: string | null): Promise<string | undefined> => {
    if (!uri) return undefined
    if (!shouldBundleWebMedia(uri)) return uri

    const existingName = parseMediaSentinel(uri)
    if (existingName && bundled.has(existingName)) {
      return mediaSentinel(existingName)
    }

    if (!resolveLocalMedia) {
      return uri
    }

    const resolved = await resolveLocalMedia(uri)
    if (!resolved) return uri

    const name = existingName ?? resolved.name ?? `media-${++generated}.bin`
    if (!bundled.has(name)) {
      bundled.set(name, { ...resolved, name })
    }
    return mediaSentinel(name)
  }

  const exportSaves: Save[] = []
  for (const save of excludeVaultSaves(saves)) {
    const image_urls = save.image_urls?.length
      ? ((await Promise.all(save.image_urls.map(u => bundleUri(u)))).filter(Boolean) as string[])
      : save.image_urls
    exportSaves.push({
      ...save,
      url: await bundleUri(save.url),
      image_url: await bundleUri(save.image_url),
      image_urls,
    })
  }

  const exportCollections: Collection[] = []
  for (const collection of collections) {
    const stripped = stripCollectionForExport(collection)
    exportCollections.push({
      ...stripped,
      cover_image_url: (await bundleUri(stripped.cover_image_url)) ?? stripped.cover_image_url,
    })
  }

  return {
    payload: {
      version: BACKUP_VERSION,
      exportedAt,
      saves: exportSaves,
      collections: exportCollections,
    },
    media: [...bundled.values()],
  }
}
