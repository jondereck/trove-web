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

function playTone(frequency: number, durationMs: number, volume = 0.04): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.value = volume
  oscillator.connect(gain)
  gain.connect(ctx.destination)

  const now = ctx.currentTime
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
  oscillator.start(now)
  oscillator.stop(now + durationMs / 1000 + 0.02)
}

export function playNavClick(): void {
  playTone(520, 45, 0.055)
}

export function playHover(): void {
  playTone(680, 22, 0.03)
}

export function playCardClick(): void {
  playTone(480, 38, 0.05)
}

export function playSuccess(): void {
  playTone(440, 70, 0.06)
  window.setTimeout(() => playTone(660, 90, 0.055), 70)
}

export function primeSounds(): void {
  void getAudioContext()
}
