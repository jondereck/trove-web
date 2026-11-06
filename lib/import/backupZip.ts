import JSZip from 'jszip'
import { parseBackupJson } from './backupJson'
import { mimeFromMediaName, requireSafeMediaBasename } from '../backup/media'
import type { BundledMedia } from '../backup/payload'
import type { Collection, Save } from '../types'

export async function parseBackupZip(buffer: ArrayBuffer): Promise<{
  saves: Save[]
  collections: Collection[]
  media: BundledMedia[]
}> {
  const zip = await JSZip.loadAsync(buffer)
  const backupFile = zip.file('backup.json')

  if (!backupFile) {
    throw new Error('This zip does not contain backup.json.')
  }

  const raw = await backupFile.async('string')
  const parsed = parseBackupJson(raw)
  const media: BundledMedia[] = []

  const files = Object.values(zip.files)
  for (const file of files) {
    if (file.dir) continue
    const path = file.name.replace(/\\/g, '/')
    if (!path.startsWith('media/') || path === 'media/') continue
    const name = requireSafeMediaBasename(path.slice('media/'.length))
    const bytes = await file.async('uint8array')
    media.push({ name, bytes, mime: mimeFromMediaName(name) })
  }

  return { ...parsed, media }
}
