import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { filterSavesByReminderIds } from './libraryReminderFilter'

describe('libraryReminderFilter', () => {
  it('filters saves by reminder ids', () => {
    const saves = [
      { id: 'save-a', title: 'A' },
      { id: 'save-b', title: 'B' },
    ]
    assert.deepEqual(filterSavesByReminderIds(saves, ['save-a']).map(s => s.id), ['save-a'])
    assert.deepEqual(filterSavesByReminderIds(saves, []), [])
  })
})
