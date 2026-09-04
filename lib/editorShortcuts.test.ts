import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  matchEditorShortcut,
  pushEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
  type EditorHistory,
} from './editorShortcuts'

describe('matchEditorShortcut', () => {
  it('maps mod+z / mod+shift+z / mod+y to undo and redo', () => {
    assert.equal(matchEditorShortcut({ key: 'z', metaKey: true, shiftKey: false }), 'undo')
    assert.equal(matchEditorShortcut({ key: 'z', ctrlKey: true, shiftKey: false }), 'undo')
    assert.equal(matchEditorShortcut({ key: 'z', metaKey: true, shiftKey: true }), 'redo')
    assert.equal(matchEditorShortcut({ key: 'y', ctrlKey: true, shiftKey: false }), 'redo')
  })

  it('maps mod+b / i / u to format toggles', () => {
    assert.equal(matchEditorShortcut({ key: 'b', metaKey: true }), 'bold')
    assert.equal(matchEditorShortcut({ key: 'i', ctrlKey: true }), 'italic')
    assert.equal(matchEditorShortcut({ key: 'u', metaKey: true }), 'underline')
  })

  it('ignores shortcuts without a modifier', () => {
    assert.equal(matchEditorShortcut({ key: 'b' }), null)
    assert.equal(matchEditorShortcut({ key: 'z' }), null)
  })
})

describe('editor history', () => {
  it('pushes snapshots and undoes then redoes', () => {
    let hist: EditorHistory = { past: [], present: 'a', future: [] }
    hist = pushEditorHistory(hist, 'ab')
    hist = pushEditorHistory(hist, 'abc')
    assert.equal(hist.present, 'abc')
    hist = undoEditorHistory(hist)
    assert.equal(hist.present, 'ab')
    hist = undoEditorHistory(hist)
    assert.equal(hist.present, 'a')
    hist = redoEditorHistory(hist)
    assert.equal(hist.present, 'ab')
  })

  it('does not push duplicate consecutive values', () => {
    let hist: EditorHistory = { past: [], present: 'a', future: [] }
    hist = pushEditorHistory(hist, 'a')
    assert.deepEqual(hist.past, [])
  })
})
