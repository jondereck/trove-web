import JSZip from 'jszip'
import type { BackupPayload } from '../types'
import { requireSafeMediaBasename } from './media'
import type { BundledMedia } from './payload'

export async function createBackupZipBytes(
  payload: BackupPayload,
  media: BundledMedia[] = [],
): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('backup.json', JSON.stringify(payload, null, 2))
  for (const file of media) {
    zip.file(`media/${requireSafeMediaBasename(file.name)}`, file.bytes)
  }
  return zip.generateAsync({ type: 'uint8array' })
}

export function backupZipFile(
  bytes: Uint8Array,
  filename: string,
): File {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new File([copy], filename, { type: 'application/zip' })
}
