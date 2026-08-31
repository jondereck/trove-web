'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Pin, Trash2 } from 'lucide-react'
import type { Save, Collection } from '@/lib/types'
import type { StoredSaveReminder } from '@/lib/saveRemindersCore'
import type { SaveStatus } from '@/hooks/useSaveDetail'
import { readSaveBody } from '@/lib/saveDetailCore'
import { getSaveImageUrls } from '@/lib/saveImages'
import { openSaveLink, shareSave } from '@/lib/openLink'
import { formatNoteForCopy } from '@/lib/noteChecklist'
import SaveDetailMetaRow from '@/components/SaveDetailMetaRow'
import NoteBodyEditor from '@/components/NoteBodyEditor'
import GalleryStrip from '@/components/GalleryStrip'
import SaveDetailCollectionChips from '@/components/SaveDetailCollectionChips'
import SaveDetailTags from '@/components/SaveDetailTags'
import SaveDetailPreviewCard from '@/components/SaveDetailPreviewCard'
import SaveDetailToolbar from '@/components/SaveDetailToolbar'
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
  const [previewIndex, setPreviewIndex] = useState(0)
  const [lightbox, setLightbox] = useState<{ url: string; kind: 'image' | 'video' } | null>(null)

  const body = readSaveBody(save)
  const isNote = save.type === 'note'
  const galleryUrls = getSaveImageUrls(save)
  const showGallery = save.type === 'image' && galleryUrls.length > 0

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
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={onDelete}
            disabled={!canEdit}
            aria-label="Delete save"
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

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

          <div className={styles.bodySection}>
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

      <SaveDetailToolbar
        canEdit={canEdit}
        hasUrl={!!save.url}
        onAddNote={() => onSetEditingBody(true)}
        onChangeCover={onChangeCover}
        onAdjustTitle={() => onSetEditingTitle(true)}
        onShare={handleShare}
        onOpen={openLink}
        onMore={() => setMoreOpen(true)}
      />

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
