import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mediaExtForFile } from './mediaUpload'

describe('mediaExtForFile', () => {
  it('prefers filename extension', () => {
    const file = { name: 'shot.PNG', type: 'image/png' } as File
    assert.equal(mediaExtForFile(file), 'png')
  })

  it('falls back to mime type', () => {
    const file = { name: 'blob', type: 'image/webp' } as File
    assert.equal(mediaExtForFile(file), 'webp')
  })

  it('handles pdf and video mime fallbacks', () => {
    assert.equal(mediaExtForFile({ name: 'doc', type: 'application/pdf' } as File), 'pdf')
    assert.equal(mediaExtForFile({ name: 'clip', type: 'video/webm' } as File), 'webm')
  })
})
