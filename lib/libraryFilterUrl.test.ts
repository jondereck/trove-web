import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  detailHrefWithFrom,
  libraryBackHref,
  libraryHref,
  parseLibraryFilterParam,
} from './libraryFilterUrl'

describe('libraryFilterUrl', () => {
  it('parses known filters and rejects junk', () => {
    assert.equal(parseLibraryFilterParam('tracker'), 'tracker')
    assert.equal(parseLibraryFilterParam('note'), 'note')
    assert.equal(parseLibraryFilterParam('nope'), null)
    assert.equal(parseLibraryFilterParam(null), null)
  })

  it('builds library hrefs', () => {
    assert.equal(libraryHref('all'), '/library')
    assert.equal(libraryHref('tracker'), '/library?filter=tracker')
  })

  it('appends from on detail links', () => {
    assert.equal(detailHrefWithFrom('/tracker/abc', 'tracker'), '/tracker/abc?from=tracker')
    assert.equal(detailHrefWithFrom('/library/abc', 'all'), '/library/abc')
    assert.equal(detailHrefWithFrom('/library/abc', null), '/library/abc')
  })

  it('builds back href from from= param', () => {
    assert.equal(libraryBackHref('tracker'), '/library?filter=tracker')
    assert.equal(libraryBackHref(null, 'tracker'), '/library?filter=tracker')
    assert.equal(libraryBackHref(null), '/library')
  })
})
