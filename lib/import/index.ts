import { parseBackupJson } from './backupJson'
import { parseBackupZip } from './backupZip'
import { isRaindropCsv, previewRaindropCsv } from './raindropCsv'
import type { BundledMedia } from '../backup/payload'
import type { Collection, Save } from '../types'

export type ImportSource = 'trove-json' | 'trove-zip' | 'raindrop-csv'

export type ImportParseResult = {
  saves: Save[]
  collections: Collection[]
  source: ImportSource
  media?: BundledMedia[]
}

type ImportKind = 'json' | 'zip' | 'csv' | 'unsupported'

function classifyImportExt(name: string): ImportKind {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'json' || ext === 'zip' || ext === 'csv') return ext
  return 'unsupported'
}

export async function parseImportFile(file: File): Promise<ImportParseResult> {
  const kind = classifyImportExt(file.name)
  switch (kind) {
    case 'json': {
      const raw = await file.text()
      const parsed = parseBackupJson(raw)
      return { ...parsed, source: 'trove-json' }
    }
    case 'zip': {
      const buffer = await file.arrayBuffer()
      const parsed = await parseBackupZip(buffer)
      return { ...parsed, source: 'trove-zip' }
    }
    case 'csv': {
      const raw = await file.text()
      if (!isRaindropCsv(raw)) {
        throw new Error('Unsupported CSV. Use a Raindrop.io export or Trove JSON/zip backup.')
      }
      const parsed = previewRaindropCsv(raw)
      return { ...parsed, source: 'raindrop-csv' }
    }
    case 'unsupported':
      throw new Error('Unsupported file type. Choose .json, .zip, or Raindrop .csv.')
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unhandled import type: ${String(_exhaustive)}`)
    }
  }
}
