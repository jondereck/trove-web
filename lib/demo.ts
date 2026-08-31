import demoPayload from '@/data/demo-library.json'
import type { BackupPayload } from './types'
import { filterLibrarySaves } from './libraryCore'

export function getDemoLibrary(): BackupPayload {
  const payload = demoPayload as BackupPayload
  return {
    ...payload,
    saves: filterLibrarySaves(payload.saves),
  }
}
