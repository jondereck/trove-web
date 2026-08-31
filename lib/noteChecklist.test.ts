import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  bodyHasChecklist,
  buildNoteCardChecklistPreview,
  convertFromChecklist,
  convertToChecklist,
  formatChecklistForCopy,
  formatNoteForCopy,
  insertChecklistItem,
  parseChecklistLines,
  removeChecklistAt,
  setChecklistTextAt,
  toggleChecklistAt,
} from './noteChecklist'

describe('noteChecklist', () => {
  it('parses markdown checkbox lines', () => {
    const body = 'Hello\n- [ ] one\n- [x] two\nplain'
    const lines = parseChecklistLines(body)
    assert.equal(lines.length, 2)
    assert.equal(lines[0].checked, false)
    assert.equal(lines[0].text, 'one')
    assert.equal(lines[1].checked, true)
    assert.equal(bodyHasChecklist(body), true)
  })

  it('toggles a checkbox in place', () => {
    const body = '- [ ] buy milk\nnote'
    const next = toggleChecklistAt(body, 0)
    assert.equal(next, '- [x] buy milk\nnote')
    assert.equal(toggleChecklistAt(next, 0), '- [ ] buy milk\nnote')
  })

  it('inserts a checklist item', () => {
    assert.equal(insertChecklistItem(''), '- [ ]')
    assert.equal(insertChecklistItem('Hi', 'task'), 'Hi\n- [ ] task')
  })

  it('sinks a newly checked item below remaining unchecked ones', () => {
    const body = '- [ ] a\n- [ ] b\n- [x] c'
    assert.equal(toggleChecklistAt(body, 0), '- [ ] b\n- [x] a\n- [x] c')
  })

  it('inserts new items above already-checked ones', () => {
    assert.equal(insertChecklistItem('- [x] done', 'new'), '- [ ] new\n- [x] done')
  })

  it('edits checklist item text', () => {
    assert.equal(setChecklistTextAt('- [ ] old', 0, 'new'), '- [ ] new')
  })

  it('turns a multiline paste into individual tick boxes', () => {
    assert.equal(
      setChecklistTextAt('- [ ]', 0, 'Item 1\nItem 2\nItem 3'),
      '- [ ] Item 1\n- [ ] Item 2\n- [ ] Item 3',
    )
  })

  it('keeps later tick boxes after a multiline paste into the first item', () => {
    assert.equal(
      setChecklistTextAt('- [ ] a\n- [ ] keep', 0, 'one\ntwo'),
      '- [ ] one\n- [ ] two\n- [ ] keep',
    )
  })

  it('skips blank lines in a pasted checklist block', () => {
    assert.equal(
      setChecklistTextAt('- [ ]', 0, 'milk\n\neggs\n'),
      '- [ ] milk\n- [ ] eggs',
    )
  })

  it('removes a checklist item', () => {
    assert.equal(removeChecklistAt('- [ ] a\n- [ ] b', 0), '- [ ] b')
  })

  it('converts every existing line into tick boxes', () => {
    assert.equal(convertToChecklist('milk\neggs'), '- [ ] milk\n- [ ] eggs')
  })

  it('converts an empty note into one blank tick box', () => {
    assert.equal(convertToChecklist(''), '- [ ]')
  })

  it('converts only the selected lines', () => {
    const body = 'keep me\nmake me\nalso me'
    const start = body.indexOf('make')
    const end = body.length
    assert.equal(
      convertToChecklist(body, { start, end }),
      'keep me\n- [ ] make me\n- [ ] also me',
    )
  })

  it('hides checkboxes by converting back to plain lines', () => {
    assert.equal(convertFromChecklist('- [ ] milk\n- [x] eggs'), 'milk\neggs')
    assert.equal(convertFromChecklist('note\n- [ ] a\n- [ ]'), 'note\na')
  })

  it('formats checklists for copy without markdown syntax', () => {
    assert.equal(formatChecklistForCopy('- [ ] milk\n- [x] eggs'), '☐ milk\n☑ eggs')
    assert.equal(
      formatNoteForCopy('Groceries', '- [ ] milk\nplain'),
      'Groceries\n\n☐ milk\nplain',
    )
  })

  it('builds a card preview: max 4 open items, ellipsis, ticked summary', () => {
    const body = [
      '- [ ] one',
      '- [ ] two',
      '- [ ] three',
      '- [ ] four',
      '- [ ] five',
      '- [x] done a',
      '- [x] done b',
    ].join('\n')
    const preview = buildNoteCardChecklistPreview(body, 4)
    assert.ok(preview)
    assert.deepEqual(preview.visible.map(v => v.text), ['one', 'two', 'three', 'four'])
    assert.equal(preview.hiddenOpenCount, 1)
    assert.equal(preview.tickedCount, 2)
    assert.equal(preview.tickedLabel, '+ 2 ticked items')
  })

  it('uses singular ticked label and no ellipsis when within limit', () => {
    const preview = buildNoteCardChecklistPreview('- [ ] only\n- [x] done', 4)
    assert.ok(preview)
    assert.equal(preview.visible.length, 1)
    assert.equal(preview.hiddenOpenCount, 0)
    assert.equal(preview.tickedCount, 1)
    assert.equal(preview.tickedLabel, '+ 1 ticked item')
  })

  it('returns null preview when body has no checklist', () => {
    assert.equal(buildNoteCardChecklistPreview('plain note'), null)
  })
})
