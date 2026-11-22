import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dataBackend, isNeonDataBackend, supabaseMirrorEnabled } from './dataBackend'

describe('dataBackend', () => {
  it('defaults to neon', () => {
    assert.equal(dataBackend({}), 'neon')
    assert.equal(dataBackend({ NEXT_PUBLIC_DATA_BACKEND: '' }), 'neon')
    assert.equal(dataBackend({ NEXT_PUBLIC_DATA_BACKEND: 'neon' }), 'neon')
    assert.equal(isNeonDataBackend({}), true)
  })

  it('uses supabase only when the value is explicit', () => {
    assert.equal(dataBackend({ NEXT_PUBLIC_DATA_BACKEND: 'supabase' }), 'supabase')
    assert.equal(dataBackend({ NEXT_PUBLIC_DATA_BACKEND: ' Supabase ' }), 'supabase')
    assert.equal(isNeonDataBackend({ NEXT_PUBLIC_DATA_BACKEND: 'supabase' }), false)
  })

  it('does not treat an unknown value as supabase', () => {
    assert.equal(dataBackend({ NEXT_PUBLIC_DATA_BACKEND: 'neom' }), 'neon')
  })
})

describe('supabaseMirrorEnabled', () => {
  it('stays off unless explicitly enabled', () => {
    assert.equal(supabaseMirrorEnabled({}), false)
    assert.equal(supabaseMirrorEnabled({ SUPABASE_MIRROR: '0' }), false)
    assert.equal(supabaseMirrorEnabled({ SUPABASE_SERVICE_ROLE_KEY: 'present' }), false)
    assert.equal(supabaseMirrorEnabled({ SUPABASE_MIRROR: '1' }), true)
    assert.equal(supabaseMirrorEnabled({ SUPABASE_MIRROR: 'true' }), true)
    assert.equal(supabaseMirrorEnabled({ SUPABASE_MIRROR: 'YES' }), true)
  })
})
