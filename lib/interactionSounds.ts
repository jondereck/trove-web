import { readSoundsEnabled } from './sessionMode'
import { playCardClick, playHover, primeSounds } from './sounds'

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[data-sound]',
].join(',')

const HOVER_SKIP_SELECTOR = 'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea'

function soundsAllowed(): boolean {
  if (typeof window === 'undefined') return false
  if (document.hidden) return false
  if (!readSoundsEnabled()) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return true
}

export function findInteractiveElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  if (target.closest('[data-no-sound]')) return null
  const el = target.closest(INTERACTIVE_SELECTOR)
  if (!el || !(el instanceof HTMLElement)) return null
  if (el instanceof HTMLButtonElement && el.disabled) return null
  if (el instanceof HTMLInputElement && el.disabled) return null
  if (el instanceof HTMLSelectElement && el.disabled) return null
  if (el instanceof HTMLTextAreaElement && el.disabled) return null
  if (el instanceof HTMLAnchorElement && !el.href && !el.getAttribute('role')) return null
  return el
}

function canHoverSound(el: HTMLElement): boolean {
  return !el.matches(HOVER_SKIP_SELECTOR)
}

export function bindInteractionSounds(): () => void {
  const primeOnGesture = () => {
    primeSounds()
  }
  document.addEventListener('pointerdown', primeOnGesture, { once: true, capture: true })
  document.addEventListener('keydown', primeOnGesture, { once: true, capture: true })

  let lastHoverEl: HTMLElement | null = null

  const onPointerOver = (event: PointerEvent) => {
    if (!soundsAllowed()) return
    if (event.pointerType === 'touch') return
    const el = findInteractiveElement(event.target)
    if (!el || el === lastHoverEl || !canHoverSound(el)) return
    lastHoverEl = el
    playHover()
  }

  const onPointerOut = (event: PointerEvent) => {
    const el = findInteractiveElement(event.target)
    if (!el || el !== lastHoverEl) return
    const related =
      event.relatedTarget instanceof Element ? findInteractiveElement(event.relatedTarget) : null
    if (related !== el) lastHoverEl = null
  }

  const onClick = (event: MouseEvent) => {
    if (!soundsAllowed()) return
    const el = findInteractiveElement(event.target)
    if (!el) return
    playCardClick()
  }

  document.addEventListener('pointerover', onPointerOver)
  document.addEventListener('pointerout', onPointerOut)
  document.addEventListener('click', onClick, true)

  return () => {
    document.removeEventListener('pointerdown', primeOnGesture, true)
    document.removeEventListener('keydown', primeOnGesture, true)
    document.removeEventListener('pointerover', onPointerOver)
    document.removeEventListener('pointerout', onPointerOut)
    document.removeEventListener('click', onClick, true)
  }
}
