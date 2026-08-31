'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { tagChipColor } from '@/lib/saveCardLayout'
import styles from './SaveDetailTags.module.css'

const MAX_TAGS = 5

type Props = {
  tags: string[]
  canEdit: boolean
  onChange: (tags: string[]) => void
}

export default function SaveDetailTags({ tags, canEdit, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  const addTag = () => {
    const next = draft.trim().toLowerCase()
    if (!next || tags.includes(next) || tags.length >= MAX_TAGS) return
    onChange([...tags, next])
    setDraft('')
    setAdding(false)
  }

  return (
    <section className={styles.section}>
      <span className={styles.label}>Tags</span>
      <div className={styles.row}>
        {tags.map(tag => {
          const colors = tagChipColor(tag)
          return (
            <span
              key={tag}
              className={styles.pill}
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {tag}
              {canEdit ? (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              ) : null}
            </span>
          )
        })}

        {canEdit && tags.length < MAX_TAGS ? (
          adding ? (
            <form
              className={styles.addForm}
              onSubmit={e => {
                e.preventDefault()
                addTag()
              }}
            >
              <input
                className={styles.addInput}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Tag name"
                autoFocus
                maxLength={32}
                onBlur={() => {
                  if (!draft.trim()) setAdding(false)
                }}
              />
            </form>
          ) : (
            <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
              <Plus size={14} strokeWidth={2} />
              Add tag
            </button>
          )
        ) : null}
      </div>
      {canEdit ? <p className={styles.hint}>Up to {MAX_TAGS} tags</p> : null}
    </section>
  )
}
