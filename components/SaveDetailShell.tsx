'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, EllipsisVertical, Keyboard, Pin, Redo2, Undo2 } from 'lucide-react'
import type { Save, Collection } from '@/lib/types'
import type { StoredSaveReminder } from '@/lib/saveRemindersCore'
import type { SaveStatus } from '@/hooks/useSaveDetail'
import { readSaveBody } from '@/lib/saveDetailCore'
import { getSaveImageUrls } from '@/lib/saveImages'
import { openSaveLink, shareSave } from '@/lib/openLink'
import { formatNoteForCopy } from '@/lib/noteChecklist'
import { formatTextStyle } from '@/lib/editorStyle'
import {
  EDITOR_SHORTCUT_GUIDE,
  matchEditorShortcut,
} from '@/lib/editorShortcuts'
import SaveDetailMetaRow from '@/components/SaveDetailMetaRow'
import NoteBodyEditor from '@/components/NoteBodyEditor'
import GalleryStrip from '@/components/GalleryStrip'
import SaveDetailCollectionChips from '@/components/SaveDetailCollectionChips'
import SaveDetailTags from '@/components/SaveDetailTags'
import SaveDetailPreviewCard from '@/components/SaveDetailPreviewCard'

import SaveDetailMoreSheet from '@/components/SaveDetailMoreSheet'
import MediaLightbox from '@/components/MediaLightbox'
import styles from './SaveDetailShell.module.css'

export type SaveDetailShellProps = {
  save: Save
  collections: Collection[]
  reminders: StoredSaveReminder[]
  canEdit: boolean
  saveStatus: SaveStatus
  editingTitle: boolean
  editingBody: boolean
  refreshingPreview: boolean
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onToggleFormat?: (key: 'bold' | 'italic' | 'underline') => void
  onSetEditingTitle: (value: boolean) => void
  onSetEditingBody: (value: boolean) => void
  onTitleChange: (title: string) => void
  onTitleSave: () => void
  onBodyChange: (body: string) => void
  onToggleChecklist: (lineIndex: number) => void
  onMoveToCollection: (collectionId: string | null) => void
  onTagsChange: (tags: string[]) => void
  onTogglePin: () => void
  onDelete: () => void
  onRefreshPreview: () => void
  onReminder?: () => void
  onFindInNote?: () => void
  onChangeCover?: () => void
  onGalleryAdd?: () => void
  backHref?: string
}

export default function SaveDetailShell({
  save,
  collections,
  reminders,
  canEdit,
  saveStatus,
  editingTitle,
  editingBody,
  refreshingPreview,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onToggleFormat,
  onSetEditingTitle,
  onSetEditingBody,
  onTitleChange,
  onTitleSave,
  onBodyChange,
  onToggleChecklist,
  onMoveToCollection,
  onTagsChange,
  onTogglePin,
  onDelete,
  onRefreshPreview,
  onReminder,
  onFindInNote,
  onChangeCover,
  onGalleryAdd,
  backHref = '/library',
}: SaveDetailShellProps) {
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [lightbox, setLightbox] = useState<{ url: string; kind: 'image' | 'video' } | null>(null)

  const body = readSaveBody(save)
  const isNote = save.type === 'note'
  const galleryUrls = getSaveImageUrls(save)
  const showGallery = save.type === 'image' && galleryUrls.length > 0
  const bodyStyle = formatTextStyle(save.editor_style?.bodyFormat, isNote ? 16 : 15, 'var(--trove-text)')

  useEffect(() => {
    if (!canEdit) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const typing =
        tag === 'INPUT' || tag === 'TEXTAREA' || !!target?.isContentEditable
      const action = matchEditorShortcut(e)
      if (!action) return
      if (action === 'undo' || action === 'redo') {
        e.preventDefault()
        if (action === 'undo') onUndo?.()
        else onRedo?.()
        return
      }
      if (!typing && !editingBody && !editingTitle) return
      e.preventDefault()
      onToggleFormat?.(action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canEdit, editingBody, editingTitle, onUndo, onRedo, onToggleFormat])

  const statusLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved'
        ? 'Saved'
        : saveStatus === 'error'
          ? 'Could not save'
          : null

  const openLink = () => {
    if (save.url) openSaveLink(save.url)
  }

  const handleCopy = async () => {
    const text = isNote ? formatNoteForCopy(save.title, body) : save.title
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
  }

  const handleShare = async () => {
    await shareSave(save.title, save.url)
  }

  const openLightbox = (index: number) => {
    const url = galleryUrls[index]
    if (!url) return
    setLightbox({ url, kind: save.type === 'video' ? 'video' : 'image' })
  }

  return (
    <div className={styles.wrap}>
      <Link href={backHref} className={styles.back}>
        <ArrowLeft size={16} strokeWidth={2} />
        Library
      </Link>

      <header className={styles.header}>
        <div />
        <div className={styles.headerActions}>
          {statusLabel ? (
            <span
              className={`${styles.status} ${
                saveStatus === 'saving'
                  ? styles.statusSaving
                  : saveStatus === 'saved'
                    ? styles.statusSaved
                    : saveStatus === 'error'
                      ? styles.statusError
                      : ''
              }`}
            >
              {statusLabel}
            </span>
          ) : null}
          {canEdit ? (
            <>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onUndo?.()}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (Ctrl/⌘ Z)"
              >
                <Undo2 size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onRedo?.()}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (Ctrl/⌘ Shift Z)"
              >
                <Redo2 size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={`${styles.iconBtn} ${guideOpen ? styles.iconBtnActive : ''}`}
                onClick={() => setGuideOpen(o => !o)}
                aria-label="Keyboard shortcuts"
                aria-expanded={guideOpen}
                title="Keyboard shortcuts"
              >
                <Keyboard size={18} strokeWidth={2} />
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={`${styles.iconBtn} ${save.is_pinned ? styles.iconBtnActive : ''}`}
            onClick={onTogglePin}
            disabled={!canEdit}
            aria-label={save.is_pinned ? 'Unpin save' : 'Pin save'}
          >
            <Pin size={18} strokeWidth={2} fill={save.is_pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setMoreOpen(true)}
            aria-label="More actions"
          >
            <EllipsisVertical size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {guideOpen ? (
        <div className={styles.shortcutGuide} role="region" aria-label="Keyboard shortcuts">
          <p className={styles.shortcutGuideTitle}>Shortcuts</p>
          <ul className={styles.shortcutList}>
            {EDITOR_SHORTCUT_GUIDE.map(row => (
              <li key={row.keys}>
                <kbd>{row.keys}</kbd>
                <span>{row.action}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.grid}>
        <div className={styles.left}>
          <SaveDetailMetaRow
            save={save}
            remindersCount={reminders.length}
            refreshingPreview={refreshingPreview}
            canEdit={canEdit}
            onOpenLink={save.url ? openLink : undefined}
            onRefreshPreview={onRefreshPreview}
            onReminderClick={onReminder}
          />

          {editingTitle && canEdit ? (
            <textarea
              className={`${styles.title} ${styles.titleInput} serif`}
              value={save.title}
              onChange={e => onTitleChange(e.target.value)}
              onBlur={() => {
                onSetEditingTitle(false)
                onTitleSave()
              }}
              autoFocus
              rows={2}
            />
          ) : (
            <button
              type="button"
              className={styles.titleButton}
              onClick={() => canEdit && onSetEditingTitle(true)}
              disabled={!canEdit}
            >
              <h1 className={`${styles.title} serif`}>{save.title || 'Untitled'}</h1>
            </button>
          )}

          {showGallery ? (
            <div className={styles.gallerySection}>
              <GalleryStrip
                urls={galleryUrls}
                onSelect={openLightbox}
                onAdd={canEdit ? onGalleryAdd : undefined}
              />
            </div>
          ) : null}

          <div className={styles.bodySection} style={isNote ? bodyStyle : undefined}>
            {isNote ? (
              <NoteBodyEditor
                body={body}
                editing={editingBody}
                canEdit={canEdit}
                onChangeBody={onBodyChange}
                onStartEdit={() => onSetEditingBody(true)}
                onToggleChecklist={onToggleChecklist}
              />
            ) : editingBody && canEdit ? (
              <textarea
                className={styles.bodyInput}
                value={body}
                onChange={e => onBodyChange(e.target.value)}
                onBlur={() => onSetEditingBody(false)}
                placeholder="Add a description…"
                autoFocus
              />
            ) : (
              <button
                type="button"
                className={styles.bodyButton}
                onClick={() => canEdit && onSetEditingBody(true)}
                disabled={!canEdit}
              >
                {body || (canEdit ? 'Tap to add a description…' : '')}
              </button>
            )}
          </div>

          <SaveDetailCollectionChips
            collections={collections}
            selectedId={save.collection_id}
            canEdit={canEdit}
            onSelect={onMoveToCollection}
            onNavigateCollection={id => router.push(`/collections/${id}`)}
          />

          <SaveDetailTags tags={save.tags ?? []} canEdit={canEdit} onChange={onTagsChange} />
        </div>

        <SaveDetailPreviewCard
          save={save}
          selectedIndex={previewIndex}
          onSelectIndex={setPreviewIndex}
          onOpenLink={openLink}
          onHeroClick={() => {
            const url = galleryUrls[previewIndex] ?? save.image_url
            if (url) setLightbox({ url, kind: save.type === 'video' ? 'video' : 'image' })
          }}
        />
      </div>

      <SaveDetailMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onReminder={onReminder}
        onFindInNote={isNote ? onFindInNote : undefined}
        onCopy={() => void handleCopy()}
        onShare={() => void handleShare()}
        onDelete={canEdit ? onDelete : undefined}
      />

      <MediaLightbox
        url={lightbox?.url ?? null}
        kind={lightbox?.kind}
        onClose={() => setLightbox(null)}
      />
    </div>
  )
}
