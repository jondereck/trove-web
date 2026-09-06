import type { CollectionWithCount } from './collections'
import type { Save } from './types'
import type { SessionMode } from './sessionMode'

/** SSR-safe defaults — never read localStorage/session cache here. */
export type CloudLibraryStateSeed = {
  loading: boolean
  error: string
  saves: Save[]
  collections: CollectionWithCount[]
  mode: SessionMode
  importFileName?: string
  firstName?: string
}

export function createInitialCloudLibraryState(): CloudLibraryStateSeed {
  return {
    loading: true,
    error: '',
    saves: [],
    collections: [],
    mode: 'cloud',
  }
}
