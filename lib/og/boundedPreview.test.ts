import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fieldsFromOEmbed } from './boundedPreview'

describe('fieldsFromOEmbed', () => {
  it('uses the poster as title and the caption as description', () => {
    const out = fieldsFromOEmbed(
      {
        author_name: 'Juan dela Cruz',
        title: 'Juan dela Cruz on Facebook: "Hello from the post"',
        thumbnail_url: 'https://scontent.xx/a.jpg',
      },
      'https://facebook.com/share/p/abc',
      'Facebook',
    )
    assert.ok(out)
    assert.equal(out.title, 'Juan dela Cruz')
    assert.equal(out.description, 'Hello from the post')
    assert.equal(out.image, 'https://scontent.xx/a.jpg')
    assert.equal(out.siteName, 'Facebook')
  })

  it('returns null when oEmbed has no author, title, or image', () => {
    assert.equal(fieldsFromOEmbed({}, 'https://facebook.com/share/p/abc', 'Facebook'), null)
  })
})
