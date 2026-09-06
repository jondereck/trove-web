'use client'

import { useCallback, useState } from 'react'
import {
  selectAllIds,
  toggleSelectedId,
} from '@/lib/selectionMode'

export function useSaveSelection() {
  const [active, setActive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const enter = useCallback((id: string) => {
    setActive(true)
    setSelectedIds(new Set([id]))
  }, [])

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => toggleSelectedId(prev, id))
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(selectAllIds(ids))
  }, [])

  const cancel = useCallback(() => {
    setActive(false)
    setSelectedIds(new Set())
  }, [])

  return {
    active,
    selectedIds,
    count: selectedIds.size,
    enter,
    toggle,
    selectAll,
    cancel,
  }
}
