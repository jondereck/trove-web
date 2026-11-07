// Match mobile `constants/library.ts` — keep web library pagination in sync.
export const LIBRARY_INITIAL_PAGE = 24
export const LIBRARY_LOAD_MORE = 20
export const LIBRARY_SCROLL_THRESHOLD = 300

export const COLLECTION_COVER_SCAN_PER = 8
export const COLLECTION_COVER_FETCH_MIN = 48
export const COLLECTION_COVER_FETCH_CAP = 320

export function collectionCoverFetchLimit(collectionCount: number): number {
  const n = Number.isFinite(collectionCount) ? Math.max(0, Math.floor(collectionCount)) : 0
  return Math.min(
    COLLECTION_COVER_FETCH_CAP,
    Math.max(COLLECTION_COVER_FETCH_MIN, n * COLLECTION_COVER_SCAN_PER),
  )
}
