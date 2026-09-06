'use client'

import { useCallback, useRef } from 'react'

const DEFAULT_MS = 450

type Options = {
  delayMs?: number
  onLongPress: () => void
  disabled?: boolean
}

/** Pointer long-press for selection mode (mobile SaveCard parity). */
export function useLongPress({ delayMs = DEFAULT_MS, onLongPress, disabled }: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      firedRef.current = false
      clear()
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        onLongPress()
      }, delayMs)
    },
    [clear, delayMs, disabled, onLongPress],
  )

  const onPointerUp = useCallback(() => {
    clear()
  }, [clear])

  const onPointerLeave = useCallback(() => {
    clear()
  }, [clear])

  const onPointerCancel = useCallback(() => {
    clear()
  }, [clear])

  /** Call from click handlers — returns true if long-press already handled the gesture. */
  const didLongPress = useCallback(() => {
    if (!firedRef.current) return false
    firedRef.current = false
    return true
  }, [])

  return {
    bind: {
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    },
    didLongPress,
  }
}
