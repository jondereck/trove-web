import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Collection, Save } from './types'
import type { BundledMedia } from './backup/payload'
import { mimeFromMediaName, parseMediaSentinel } from './backup/media'

const DB_NAME = 'trove-web'
const DB_VERSION = 2
const STORE = 'imports'
const MEDIA_STORE = 'import-media'

type ImportRecord = {
  id: string
  name: string
  saves: Save[]
  collections: Collection[]
  importedAt: string
}

type ImportMediaRecord = {
  id: string
  importId: string
  filename: string
  blob: Blob
}

interface TroveWebDb extends DBSchema {
  imports: {
    key: string
    value: ImportRecord
  }
  'import-media': {
    key: string
    value: ImportMediaRecord
  }
}

let dbPromise: Promise<IDBPDatabase<TroveWebDb>> | null = null
const objectUrlCache = new Map<string, string>()

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TroveWebDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          db.createObjectStore(MEDIA_STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

function objectUrlFor(importId: string, filename: string, blob: Blob): string {
  const key = `${importId}:${filename}`
  const existing = objectUrlCache.get(key)
  if (existing) return existing
  const url = URL.createObjectURL(blob)
  objectUrlCache.set(key, url)
  return url
}

function revokeImportUrls(importId: string) {
  for (const [key, url] of objectUrlCache) {
    if (!key.startsWith(`${importId}:`)) continue
    URL.revokeObjectURL(url)
    objectUrlCache.delete(key)
  }
}

async function putMedia(importId: string, media: BundledMedia[]): Promise<void> {
  if (media.length === 0) return
  const db = await getDb()
  const tx = db.transaction(MEDIA_STORE, 'readwrite')
  for (const file of media) {
    const filename = file.name
    await tx.store.put({
      id: `${importId}:${filename}`,
      importId,
      filename,
      blob: new Blob([copyBytes(file.bytes)], {
        type: file.mime ?? mimeFromMediaName(filename),
      }),
    })
  }
  await tx.done
}

export async function readImportMedia(importId: string): Promise<Map<string, Blob>> {
  const db = await getDb()
  const all = await db.getAll(MEDIA_STORE)
  const map = new Map<string, Blob>()
  for (const row of all) {
    if (row.importId === importId) map.set(row.filename, row.blob)
  }
  return map
}

function hydrateValue(value: string | undefined, media: Map<string, Blob>, importId: string) {
  const name = parseMediaSentinel(value)
  if (!name) return value
  const blob = media.get(name)
  if (!blob) return value
  return objectUrlFor(importId, name, blob)
}

function hydrateSaves(importId: string, saves: Save[], media: Map<string, Blob>): Save[] {
  if (media.size === 0) return saves
  return saves.map(save => ({
    ...save,
    url: hydrateValue(save.url, media, importId) ?? save.url,
    image_url: hydrateValue(save.image_url, media, importId) ?? save.image_url,
    image_urls: save.image_urls?.map(url => hydrateValue(url, media, importId) ?? url),
  }))
}

function hydrateCollections(
  importId: string,
  collections: Collection[],
  media: Map<string, Blob>,
): Collection[] {
  if (media.size === 0) return collections
  return collections.map(collection => ({
    ...collection,
    cover_image_url:
      hydrateValue(collection.cover_image_url ?? undefined, media, importId) ??
      collection.cover_image_url,
  }))
}

export async function writeImport(
  name: string,
  saves: Save[],
  collections: Collection[],
  media: BundledMedia[] = [],
): Promise<string> {
  const id = crypto.randomUUID()
  const db = await getDb()
  await db.put(STORE, {
    id,
    name,
    saves,
    collections,
    importedAt: new Date().toISOString(),
  })
  await putMedia(id, media)
  return id
}

export async function readImport(
  id: string,
  opts?: { hydrateMedia?: boolean },
): Promise<ImportRecord | undefined> {
  const db = await getDb()
  const record = await db.get(STORE, id)
  if (!record) return undefined
  if (opts?.hydrateMedia === false) return record
  const media = await readImportMedia(id)
  return {
    ...record,
    saves: hydrateSaves(id, record.saves, media),
    collections: hydrateCollections(id, record.collections, media),
  }
}

export async function deleteImport(id: string): Promise<void> {
  const db = await getDb()
  const media = await db.getAll(MEDIA_STORE)
  const tx = db.transaction([STORE, MEDIA_STORE], 'readwrite')
  await tx.objectStore(STORE).delete(id)
  for (const row of media) {
    if (row.importId === id) await tx.objectStore(MEDIA_STORE).delete(row.id)
  }
  await tx.done
  revokeImportUrls(id)
}
