import { parseImportFile } from '../import'
import { writeImport } from '../importStore'
import { setImportSession } from '../sessionMode'
import { createBackupZipBytes } from './createBackupZip'
import { buildExportArchive } from './gather'
import { backupZipFilename } from './payload'

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadCurrentBackup(): Promise<{
  saves: number
  collections: number
  filename: string
}> {
  const { payload, media } = await buildExportArchive()
  const bytes = await createBackupZipBytes(payload, media)
  const filename = backupZipFilename()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  triggerBrowserDownload(new Blob([copy], { type: 'application/zip' }), filename)
  return {
    saves: payload.saves.length,
    collections: payload.collections.length,
    filename,
  }
}

export async function applyLocalImport(file: File): Promise<{
  saves: number
  collections: number
}> {
  const parsed = await parseImportFile(file)
  const importId = await writeImport(
    file.name,
    parsed.saves,
    parsed.collections,
    parsed.media ?? [],
  )
  setImportSession(file.name, importId)
  return { saves: parsed.saves.length, collections: parsed.collections.length }
}
