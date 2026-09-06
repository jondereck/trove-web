import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyQuickSaveInput,
  normalizeQuickSaveUrl,
  parseQuickSaveInput,
} from './quickSaveInput'

describe('classifyQuickSaveInput', () => {
  it('returns empty for blank input', () => {
    assert.equal(classifyQuickSaveInput(''), 'empty')
    assert.equal(classifyQuickSaveInput('   \n  '), 'empty')
  })

  it('classifies a lone http URL as url', () => {
    assert.equal(classifyQuickSaveInput('https://example.com/path'), 'url')
    assert.equal(classifyQuickSaveInput('  http://trove.app  '), 'url')
  })

  it('treats extra words, lines, or checklists as a note when no url is present', () => {
    assert.equal(classifyQuickSaveInput('See you all tomorrow 10am'), 'note')
    assert.equal(classifyQuickSaveInput('- [ ] Buy milk'), 'note')
  })

  it('treats caption + url in the same paste as a link', () => {
    assert.equal(classifyQuickSaveInput('check https://example.com later'), 'url')
    assert.equal(
      classifyQuickSaveInput('https://example.com\nplease read this'),
      'url',
    )
  })

  it('treats mixed caption + url text as a link', () => {
    const parsed = parseQuickSaveInput('Remind me Friday at 3pm https://example.com/docs')
    assert.equal(parsed.kind, 'url')
    assert.equal(parsed.url, 'https://example.com/docs')
    assert.equal(parsed.contextText, 'Remind me Friday at 3pm')
  })

  it('treats social share text with caption + url as a link', () => {
    const parsed = parseQuickSaveInput(
      'Remind me on Friday at 3pm https://www.facebook.com/share/p/abc123/?mibextid=wwXIfr',
    )
    assert.equal(parsed.kind, 'url')
    assert.equal(parsed.url, 'https://www.facebook.com/share/p/abc123/?mibextid=wwXIfr')
    assert.equal(parsed.contextText, 'Remind me on Friday at 3pm')
  })

  it('normalizes wrapped or redirected facebook share urls', () => {
    assert.equal(
      normalizeQuickSaveUrl('(https://www.facebook.com/share/p/abc123/?mibextid=wwXIfr),'),
      'https://www.facebook.com/share/p/abc123/?mibextid=wwXIfr',
    )
    assert.equal(
      normalizeQuickSaveUrl('https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fpost&h=abc'),
      'https://example.com/post',
    )
  })

  it('keeps facebook share link intact when wrapped to next line', () => {
    const parsed = parseQuickSaveInput('https://www.facebook.com/share/p/\n1E8SVYEkFN/')
    assert.equal(parsed.kind, 'url')
    assert.equal(parsed.url, 'https://www.facebook.com/share/p/1E8SVYEkFN/')
  })
})
