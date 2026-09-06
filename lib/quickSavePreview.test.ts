import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  autoSelectCollectionId,
  buildQuickSaveCollectionChips,
} from './quickSavePreview'

describe('buildQuickSaveCollectionChips', () => {
  it('starts with Unsorted and marks a new AI suggestion as recommended', () => {
    const chips = buildQuickSaveCollectionChips({
      collections: [{ id: '1', name: 'Work' }],
      suggestedCollection: 'Recipes',
    })
    assert.equal(chips[0]?.id, '')
    assert.equal(chips[0]?.label, 'Unsorted')
    assert.deepEqual(chips[1], {
      id: 'Recipes',
      label: 'Recipes',
      isNew: true,
      recommended: true,
    })
    assert.equal(chips[2]?.id, 'Work')
    assert.equal(chips[2]?.recommended, false)
  })

  it('marks an existing collection recommended when AI matches it', () => {
    const chips = buildQuickSaveCollectionChips({
      collections: [{ id: '1', name: 'Work' }],
      suggestedCollection: 'work',
    })
    assert.equal(chips.find(c => c.id === 'Work')?.recommended, true)
    assert.equal(chips.some(c => c.isNew), false)
  })

  it('does not add Read Later as a new chip', () => {
    const chips = buildQuickSaveCollectionChips({
      collections: [],
      suggestedCollection: 'Read Later',
    })
    assert.equal(chips.length, 1)
    assert.equal(chips[0]?.id, '')
  })
})

describe('autoSelectCollectionId', () => {
  it('selects a real suggestion and leaves Read Later / empty as Unsorted', () => {
    assert.equal(autoSelectCollectionId('Recipes'), 'Recipes')
    assert.equal(autoSelectCollectionId('Read Later'), '')
    assert.equal(autoSelectCollectionId(''), '')
  })
})
