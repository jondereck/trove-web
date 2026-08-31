import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Collection, Save } from './types'

const DB_NAME = 'trove-web'
const DB_VERSION = 1
const STORE = 'imports'

type ImportRecord = {
  id: string
  name: string
  saves: Save[]
  collections: Collection[]
  importedAt: string
}

interface TroveWebDb extends DBSchema {
  imports: {
    key: string
    value: ImportRecord
  }
}

let dbPromise: Promise<IDBPDatabase<TroveWebDb>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TroveWebDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function writeImport(
  name: string,
  saves: Save[],
  collections: Collection[],
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
  return id
}

export async function readImport(id: string): Promise<ImportRecord | undefined> {
  const db = await getDb()
  return db.get(STORE, id)
}

export async function deleteImport(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}
