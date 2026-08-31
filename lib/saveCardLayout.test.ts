import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  plainTextFromMarkdown,
  saveCardDescriptionBlurb,
  trackerStatusColor,
} from './saveCardLayout'

describe('saveCardLayout', () => {
  it('strips markdown for note previews', () => {
    assert.equal(plainTextFromMarkdown('## Title\n\nHello **world**'), 'Title Hello world')
  })

  it('shows note body when not a checklist', () => {
    const blurb = saveCardDescriptionBlurb({
      type: 'note',
      title: 'Shopping',
      content: 'Pick up milk and eggs',
      description: '',
    })
    assert.equal(blurb, 'Pick up milk and eggs')
  })

  it('hides note blurb when checklist preview handles it', () => {
    const blurb = saveCardDescriptionBlurb({
      type: 'note',
      title: 'Groceries',
      content: '- [ ] Milk\n- [ ] Eggs',
      description: '',
    })
    assert.equal(blurb, null)
  })

  it('shows link description blurb', () => {
    const blurb = saveCardDescriptionBlurb({
      type: 'link',
      title: 'Example',
      content: '',
      description: 'A short article about design.',
    })
    assert.equal(blurb, 'A short article about design.')
  })

  it('colors tracker status dots', () => {
    assert.equal(trackerStatusColor('overdue'), '#e53e3e')
    assert.equal(trackerStatusColor('on_track'), '#2a7a4f')
  })
})
