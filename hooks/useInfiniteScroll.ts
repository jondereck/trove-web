'use client'

import { useEffect, useRef } from 'react'
import { LIBRARY_SCROLL_THRESHOLD } from '@/constants/library'

type Options = {
  enabled: boolean
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}

export function useInfiniteScroll({ enabled, hasMore, loading, onLoadMore }: Options) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !hasMore) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !loading) onLoadMore()
      },
      { rootMargin: `${LIBRARY_SCROLL_THRESHOLD}px` },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, hasMore, loading, onLoadMore])

  return sentinelRef
}
