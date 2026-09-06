import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canOpenCloudSaveDetail } from './libraryCore'
import {
  matchSuggestedCollectionName,
  parseOrganizeSuggestion,
  buildSuggestForSavePrompt,
} from './aiSuggest'

describe('canOpenCloudSaveDetail', () => {
  it('allows library and inbox saves', () => {
    assert.equal(canOpenCloudSaveDetail({ is_inbox: false, is_vault: false }), true)
    assert.equal(canOpenCloudSaveDetail({ is_inbox: true, is_vault: false }), true)
  })

  it('blocks vault saves', () => {
    assert.equal(canOpenCloudSaveDetail({ is_inbox: false, is_vault: true }), false)
  })
})

describe('parseOrganizeSuggestion', () => {
  it('parses collection and tags from model JSON', () => {
    assert.deepEqual(
      parseOrganizeSuggestion('{"collection":"Recipes","tags":["dinner","meal-prep"]}'),
      { collection: 'Recipes', tags: ['dinner', 'meal-prep'] },
    )
  })

  it('falls back safely on garbage', () => {
    assert.deepEqual(parseOrganizeSuggestion('not json'), { collection: 'Read Later', tags: [] })
  })
})

describe('matchSuggestedCollectionName', () => {
  it('prefers existing collection casing', () => {
    assert.equal(
      matchSuggestedCollectionName('recipes', [{ name: 'Recipes' }]),
      'Recipes',
    )
  })

  it('keeps a new suggested name', () => {
    assert.equal(
      matchSuggestedCollectionName('Side Projects', []),
      'Side Projects',
    )
  })
})

describe('buildSuggestForSavePrompt', () => {
  it('includes title url description and collections', () => {
    const prompt = buildSuggestForSavePrompt(
      { title: 'Hello', url: 'https://example.com', description: 'World' },
      ['Work', 'Personal'],
    )
    assert.match(prompt, /Hello/)
    assert.match(prompt, /example.com/)
    assert.match(prompt, /World/)
    assert.match(prompt, /Work, Personal/)
  })
})
