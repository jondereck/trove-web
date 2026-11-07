import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mediaObjectPublicUrl,
  mediaPathFromProxyUrl,
  readMediaPublicBase,
  rewriteProxiedMediaUrl,
} from './mediaUrl'

const base = {
  endpoint: 'https://br-example.storage.c-3.ap-southeast-1.aws.neon.tech',
  bucket: 'media',
}

describe('mediaObjectPublicUrl', () => {
  it('builds a path-style Neon object URL', () => {
    assert.equal(
      mediaObjectPublicUrl('user/1.jpg', base),
      'https://br-example.storage.c-3.ap-southeast-1.aws.neon.tech/media/user/1.jpg',
    )
  })

  it('rejects path traversal', () => {
    assert.equal(mediaObjectPublicUrl('../secret', base), null)
  })
})

describe('rewriteProxiedMediaUrl', () => {
  it('rewrites a Vercel media proxy URL to Neon', () => {
    assert.equal(
      rewriteProxiedMediaUrl('https://web-trove.vercel.app/api/media/user/1.jpg', base),
      'https://br-example.storage.c-3.ap-southeast-1.aws.neon.tech/media/user/1.jpg',
    )
  })

  it('leaves CDN and remote thumbnails alone', () => {
    assert.equal(
      rewriteProxiedMediaUrl('https://cdn.example.com/pic.jpg', base),
      'https://cdn.example.com/pic.jpg',
    )
  })

  it('reads public base from env without secrets', () => {
    const found = readMediaPublicBase({
      NEXT_PUBLIC_NEON_STORAGE_ENDPOINT: 'https://br-example.storage.neon.tech/',
      NEXT_PUBLIC_NEON_STORAGE_BUCKET: 'media',
    })
    assert.deepEqual(found, {
      endpoint: 'https://br-example.storage.neon.tech',
      bucket: 'media',
    })
  })
})

describe('mediaPathFromProxyUrl', () => {
  it('extracts the object key', () => {
    assert.equal(
      mediaPathFromProxyUrl('https://web-trove.vercel.app/api/media/a/b.png'),
      'a/b.png',
    )
  })
})
