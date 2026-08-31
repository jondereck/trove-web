import { readSoundsEnabled } from './sessionMode'

let sharedCtx: AudioContext | null = null

function canPlay(): boolean {
  if (typeof window === 'undefined') return false
  if (document.hidden) return false
  if (!readSoundsEnabled()) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return true
}

function getAudioContext(): AudioContext | null {
  if (!canPlay()) return null
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!sharedCtx) sharedCtx = new Ctx()
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume()
  }
  return sharedCtx
}

const MASTER_GAIN = 1.75

function playTone(frequency: number, durationMs: number, volume = 0.04): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const level = Math.min(volume * MASTER_GAIN, 0.14)

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.value = level
  oscillator.connect(gain)
  gain.connect(ctx.destination)

  const now = ctx.currentTime
  gain.gain.setValueAtTime(level, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
  oscillator.start(now)
  oscillator.stop(now + durationMs / 1000 + 0.02)
}

export function playNavClick(): void {
  playTone(520, 45, 0.065)
}

export function playHover(): void {
  playTone(680, 24, 0.038)
}

export function playCardClick(): void {
  playTone(480, 40, 0.06)
}

export function playSuccess(): void {
  playTone(440, 75, 0.07)
  window.setTimeout(() => playTone(660, 95, 0.065), 70)
}

export function primeSounds(): void {
  void getAudioContext()
}
