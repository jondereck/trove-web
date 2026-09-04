export type EditorShortcut =
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'underline'

export type EditorShortcutEvent = {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

export function matchEditorShortcut(event: EditorShortcutEvent): EditorShortcut | null {
  if (event.altKey) return null
  const mod = !!(event.metaKey || event.ctrlKey)
  if (!mod) return null
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase()

  if (key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (key === 'y' && !event.shiftKey) return 'redo'
  if (event.shiftKey) return null
  if (key === 'b') return 'bold'
  if (key === 'i') return 'italic'
  if (key === 'u') return 'underline'
  return null
}

export type EditorHistory = {
  past: string[]
  present: string
  future: string[]
}

const MAX_HISTORY = 100

export function pushEditorHistory(history: EditorHistory, next: string): EditorHistory {
  if (next === history.present) return history
  const past = [...history.past, history.present].slice(-MAX_HISTORY)
  return { past, present: next, future: [] }
}

export function undoEditorHistory(history: EditorHistory): EditorHistory {
  if (history.past.length === 0) return history
  const previous = history.past[history.past.length - 1]!
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redoEditorHistory(history: EditorHistory): EditorHistory {
  if (history.future.length === 0) return history
  const next = history.future[0]!
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}

export const EDITOR_SHORTCUT_GUIDE: { keys: string; action: string }[] = [
  { keys: 'Ctrl/⌘ Z', action: 'Undo' },
  { keys: 'Ctrl/⌘ Shift Z', action: 'Redo' },
  { keys: 'Ctrl/⌘ Y', action: 'Redo' },
  { keys: 'Ctrl/⌘ B', action: 'Bold' },
  { keys: 'Ctrl/⌘ I', action: 'Italic' },
  { keys: 'Ctrl/⌘ U', action: 'Underline' },
]
