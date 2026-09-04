'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import SaveDetailShell from '@/components/SaveDetailShell'
import TroveLoader from '@/components/TroveLoader'
import { useSaveDetail } from '@/hooks/useSaveDetail'
import { libraryBackHref } from '@/lib/libraryFilterUrl'
import { readSaveBody } from '@/lib/saveDetailCore'
import { toggleChecklistAt } from '@/lib/noteChecklist'
import {
  pushEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
  type EditorHistory,
} from '@/lib/editorShortcuts'
import styles from './SaveDetailPage.module.css'

type Props = {
  id: string
}

export default function SaveDetailPage({ id }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const detail = useSaveDetail(id)
  const [titleDraft, setTitleDraft] = useState('')
  const [bodyHistory, setBodyHistory] = useState<EditorHistory | null>(null)
  const [showReminder, setShowReminder] = useState(false)
  const fromFilter = searchParams.get('from')

  useEffect(() => {
    if (detail.save?.type === 'tracker') {
      const qs = fromFilter ? `?from=${encodeURIComponent(fromFilter)}` : ''
      router.replace(`/tracker/${id}${qs}`)
    }
  }, [detail.save, id, router, fromFilter])

  useEffect(() => {
    if (detail.save) setTitleDraft(detail.save.title)
  }, [detail.save?.title, detail.save])

  useEffect(() => {
    if (!detail.save) return
    const body = readSaveBody(detail.save)
    setBodyHistory({ past: [], present: body, future: [] })
  }, [detail.save?.id])

  if (detail.loading) {
    return (
      <AppShell mode={detail.mode} importFileName={detail.importFileName}>
        <TroveLoader label="Loading save…" />
      </AppShell>
    )
  }

  if (detail.error) {
    return (
      <AppShell mode={detail.mode} importFileName={detail.importFileName}>
        <p className={styles.error}>{detail.error}</p>
      </AppShell>
    )
  }

  if (!detail.save || detail.save.type === 'tracker') {
    return (
      <AppShell mode={detail.mode} importFileName={detail.importFileName}>
        <div className={styles.missing}>
          <p>Save not found.</p>
          <Link href="/library">Back to library</Link>
        </div>
      </AppShell>
    )
  }

  const save = detail.save
  const bodyPresent = bodyHistory?.present ?? readSaveBody(save)

  const applyBody = (next: string, recordHistory: boolean) => {
    if (recordHistory) {
      setBodyHistory(prev =>
        pushEditorHistory(prev ?? { past: [], present: next, future: [] }, next),
      )
    }
    void detail.updateBody(next)
  }

  const handleUndo = () => {
    setBodyHistory(prev => {
      if (!prev || prev.past.length === 0) return prev
      const next = undoEditorHistory(prev)
      void detail.updateBody(next.present)
      return next
    })
  }

  const handleRedo = () => {
    setBodyHistory(prev => {
      if (!prev || prev.future.length === 0) return prev
      const next = redoEditorHistory(prev)
      void detail.updateBody(next.present)
      return next
    })
  }

  return (
    <AppShell mode={detail.mode} importFileName={detail.importFileName}>
      {!detail.canEdit ? (
        <p className={styles.readOnlyHint}>Sign in with Trove Cloud to edit saves on web.</p>
      ) : null}

      <SaveDetailShell
        save={{
          ...save,
          title: titleDraft || save.title,
          ...(save.type === 'note'
            ? { content: bodyPresent }
            : { description: bodyPresent }),
        }}
        collections={detail.collections}
        reminders={detail.reminders}
        canEdit={detail.canEdit}
        saveStatus={detail.saveStatus}
        editingTitle={detail.editingTitle}
        editingBody={detail.editingBody}
        refreshingPreview={detail.refreshingPreview}
        canUndo={(bodyHistory?.past.length ?? 0) > 0}
        canRedo={(bodyHistory?.future.length ?? 0) > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleFormat={key => void detail.updateBodyFormat(key)}
        onSetEditingTitle={detail.setEditingTitle}
        onSetEditingBody={detail.setEditingBody}
        onTitleChange={setTitleDraft}
        onTitleSave={() => void detail.updateTitle(titleDraft)}
        onBodyChange={next => applyBody(next, true)}
        onToggleChecklist={lineIndex => {
          applyBody(toggleChecklistAt(bodyPresent, lineIndex), true)
        }}
        onMoveToCollection={collectionId => void detail.moveToCollection(collectionId)}
        onTagsChange={tags => void detail.setTags(tags)}
        onTogglePin={() => void detail.togglePin()}
        onDelete={() => {
          if (window.confirm('Delete this save?')) void detail.removeSave()
        }}
        onRefreshPreview={() => void detail.refreshPreview()}
        onReminder={() => setShowReminder(true)}
        onChangeCover={() => {
          const next = prompt(
            'Paper color (hex, e.g. #fdf6ef):',
            save.editor_style?.paperColor ?? '',
          )
          if (next === null || !detail.canEdit) return
          void detail.updatePaperColor(next.trim() || null)
        }}
        backHref={libraryBackHref(fromFilter, save.type)}
      />

      {showReminder ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setShowReminder(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-labelledby="reminder-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="reminder-title" className="serif">
              Remind me later
            </h2>
            {detail.reminders.length > 0 ? (
              <ul className={styles.reminderList}>
                {detail.reminders.map(row => (
                  <li key={row.id}>
                    <span>{detail.formatReminder(row.fireAt)}</span>
                    <button type="button" onClick={() => void detail.cancelReminder(row.id)}>
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className={styles.presetRow}>
              {detail.reminderPresets().map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!detail.canEdit}
                  onClick={() => {
                    void detail.addReminder(preset.fireAt)
                    setShowReminder(false)
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button type="button" className={styles.modalClose} onClick={() => setShowReminder(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
