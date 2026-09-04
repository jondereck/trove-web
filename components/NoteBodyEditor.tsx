'use client'

import { useMemo, useState } from 'react'
import { CheckSquare, ChevronDown, ChevronRight, Plus, Square } from 'lucide-react'
import {
  insertChecklistItem,
  parseChecklistLines,
  setChecklistTextAt,
  toggleChecklistAt,
} from '@/lib/noteChecklist'
import styles from './NoteBodyEditor.module.css'

type Props = {
  body: string
  editing: boolean
  canEdit: boolean
  onChangeBody: (next: string) => void
  onStartEdit: () => void
  onToggleChecklist: (lineIndex: number) => void
  placeholder?: string
}

export default function NoteBodyEditor({
  body,
  editing,
  canEdit,
  onChangeBody,
  onStartEdit,
  onToggleChecklist,
  placeholder = 'Tap to write…',
}: Props) {
  const [checkedOpen, setCheckedOpen] = useState(true)
  const lines = useMemo(() => body.split('\n'), [body])
  const checks = useMemo(() => parseChecklistLines(body), [body])
  const checkIndexes = useMemo(() => new Set(checks.map(c => c.index)), [checks])
  const unchecked = checks.filter(c => !c.checked)
  const checked = checks.filter(c => c.checked)
  const preamble = lines
    .filter((_, i) => !checkIndexes.has(i))
    .join('\n')
    .replace(/\s+$/, '')

  const isChecklist = checks.length > 0

  if (!isChecklist && editing && canEdit) {
    return (
      <textarea
        className={styles.input}
        value={body}
        onChange={e => onChangeBody(e.target.value)}
        autoFocus
        placeholder={placeholder}
      />
    )
  }

  if (!isChecklist && !body.trim()) {
    if (!canEdit) {
      return <p className={styles.placeholder}>{placeholder}</p>
    }
    return (
      <button type="button" className={styles.placeholder} onClick={onStartEdit}>
        {placeholder}
      </button>
    )
  }

  if (!isChecklist) {
    if (canEdit) {
      return (
        <button type="button" className={styles.lineButton} onClick={onStartEdit}>
          <p className={styles.line}>{body}</p>
        </button>
      )
    }
    return <p className={styles.line}>{body}</p>
  }

  const handleToggle = (lineIndex: number) => {
    if (!canEdit) return
    if (editing) {
      onChangeBody(toggleChecklistAt(body, lineIndex))
    } else {
      onToggleChecklist(lineIndex)
    }
  }

  const renderRow = (item: { index: number; text: string }, done: boolean) => (
    <div key={`${done ? 'c' : 'u'}-${item.index}`} className={styles.row}>
      <button
        type="button"
        className={styles.tick}
        disabled={!canEdit}
        onClick={() => handleToggle(item.index)}
        aria-pressed={done}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        {done ? (
          <CheckSquare size={20} strokeWidth={1.75} />
        ) : (
          <Square size={20} strokeWidth={1.75} />
        )}
      </button>
      {editing && canEdit ? (
        <input
          className={`${styles.rowInput} ${done ? styles.rowTextDone : ''}`}
          value={item.text}
          onChange={e => onChangeBody(setChecklistTextAt(body, item.index, e.target.value))}
          onFocus={onStartEdit}
          placeholder="List item"
        />
      ) : (
        <button
          type="button"
          className={`${styles.rowTextButton} ${done ? styles.rowTextDone : ''}`}
          onClick={() => (canEdit ? onStartEdit() : undefined)}
          disabled={!canEdit}
        >
          {item.text || 'List item'}
        </button>
      )}
    </div>
  )

  return (
    <div className={styles.block}>
      {preamble ? (
        editing && canEdit ? (
          <textarea
            className={styles.preambleInput}
            value={preamble}
            onChange={e => {
              const items = lines.filter((_, i) => checkIndexes.has(i))
              onChangeBody([e.target.value.replace(/\s+$/, ''), ...items].filter(Boolean).join('\n'))
            }}
            rows={Math.max(2, preamble.split('\n').length)}
          />
        ) : canEdit ? (
          <button type="button" className={styles.lineButton} onClick={onStartEdit}>
            <p className={styles.line}>{preamble}</p>
          </button>
        ) : (
          <p className={styles.line}>{preamble}</p>
        )
      ) : null}

      {unchecked.map(item => renderRow(item, false))}

      {canEdit ? (
        <button
          type="button"
          className={styles.addRow}
          onClick={() => {
            onStartEdit()
            onChangeBody(insertChecklistItem(body, ''))
          }}
        >
          <Plus size={18} strokeWidth={2} />
          List item
        </button>
      ) : null}

      {checked.length > 0 ? (
        <>
          <button
            type="button"
            className={styles.checkedHeader}
            onClick={() => setCheckedOpen(o => !o)}
          >
            {checkedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {checked.length} checked {checked.length === 1 ? 'item' : 'items'}
          </button>
          {checkedOpen ? checked.map(item => renderRow(item, true)) : null}
        </>
      ) : null}
    </div>
  )
}
