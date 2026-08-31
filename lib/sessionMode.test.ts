import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

const SOUNDS_KEY = 'trove-web:sounds-enabled'

function readSoundsEnabledFromStorage(getItem: (key: string) => string | null): boolean {
  const raw = getItem(SOUNDS_KEY)
  if (raw === null) return true
  return raw === '1'
}

describe('readSoundsEnabled', () => {
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    ;(globalThis as typeof globalThis & { localStorage?: Storage }).localStorage = {
      getItem: key => storage[key] ?? null,
      setItem: (key, value) => {
        storage[key] = value
      },
      removeItem: key => {
        delete storage[key]
      },
      clear: () => {
        storage = {}
      },
      key: () => null,
      length: 0,
    }
  })

  afterEach(() => {
    ;(globalThis as typeof globalThis & { localStorage?: Storage }).localStorage = undefined as unknown as Storage
  })

  it('defaults to on for a fresh browser profile', () => {
    assert.equal(readSoundsEnabledFromStorage(key => storage[key] ?? null), true)
  })

  it('respects explicit off', () => {
    storage[SOUNDS_KEY] = '0'
    assert.equal(readSoundsEnabledFromStorage(key => storage[key] ?? null), false)
  })

  it('respects explicit on', () => {
    storage[SOUNDS_KEY] = '1'
    assert.equal(readSoundsEnabledFromStorage(key => storage[key] ?? null), true)
  })
})
