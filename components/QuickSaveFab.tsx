'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, FileText, Image as ImageIcon, Sparkles, Video, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { suggestForSave, suggestNoteTitle } from '@/lib/aiSuggest'
import { fetchCloudCollections, upsertCollectionByName } from '@/lib/collections'
import { fetchOGMetadata } from '@/lib/ogFetch'
import { uploadMediaFile } from '@/lib/mediaUpload'
import {
  insertQuickSaveImage,
  insertQuickSaveLink,
  insertQuickSaveNote,
  insertQuickSaveVideo,
  defaultLinkTitle,
} from '@/lib/quickSave'
import {
  classifyQuickSaveFile,
  QUICK_SAVE_DOCUMENT_ACCEPT,
  quickSaveFileUnsupportedMessage,
  titleFromFileName,
} from '@/lib/quickSaveFiles'
import { classifyQuickSaveInput, parseQuickSaveInput } from '@/lib/quickSaveInput'
import {
  autoSelectCollectionId,
  buildQuickSaveCollectionChips,
  WEB_UNSORTED_LABEL,
} from '@/lib/quickSavePreview'
import { saveDetailHref } from '@/lib/saveDetailCore'
import { playSuccess } from '@/lib/sounds'
import type { SessionMode } from '@/lib/sessionMode'
import type { Collection, SaveType } from '@/lib/types'
import styles from './QuickSaveFab.module.css'

type Step = 'input' | 'analyzing' | 'preview'

type Draft = {
  url: string
  type: SaveType
  title: string
  description: string
  imageUrl?: string
  collection: string
  tags: string[]
}

type Attachment =
  | { kind: 'image'; file: File; previewUrl: string }
  | { kind: 'video'; file: File; previewUrl: string }
  | { kind: 'pdf'; file: File }

type Props = {
  mode: SessionMode
}

export default function QuickSaveFab({ mode }: Props) {
  const router = useRouter()
  const photoRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('input')
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  useEffect(() => {
    const openFromToolbar = () => setOpen(true)
    window.addEventListener('trove:open-quick-save', openFromToolbar)
    return () => window.removeEventListener('trove:open-quick-save', openFromToolbar)
  }, [])

  const canSave = mode === 'cloud'
  const detected = attachment
    ? attachment.kind === 'pdf'
      ? 'file'
      : attachment.kind
    : classifyQuickSaveInput(input)
  const kindLabel =
    detected === 'image'
      ? 'Photo'
      : detected === 'video'
        ? 'Video'
        : detected === 'file'
          ? 'File'
          : detected === 'url'
            ? 'Link'
            : detected === 'note'
              ? 'Note'
              : null

  const collChips = useMemo(
    () =>
      buildQuickSaveCollectionChips({
        collections,
        suggestedCollection: draft?.collection,
      }),
    [collections, draft?.collection],
  )
  const picked = collChips.find(c => c.id === selectedCollection)
  const saveLabel = picked?.label ? `Save to ${picked.label}` : `Save to ${WEB_UNSORTED_LABEL}`

  const clearAttachment = () => {
    setAttachment(current => {
      if (current && 'previewUrl' in current) URL.revokeObjectURL(current.previewUrl)
      return null
    })
  }

  const reset = () => {
    setStep('input')
    setInput('')
    clearAttachment()
    setDraft(null)
    setSelectedCollection('')
    setError('')
    setStatus('')
    setSaving(false)
    setTagDraft('')
    setShowTagInput(false)
  }

  const close = () => {
    setOpen(false)
    reset()
  }

  useEffect(() => {
    if (!open || !canSave) return
    let cancelled = false
    void (async () => {
      try {
        const text = (await navigator.clipboard.readText())?.trim()
        if (!cancelled && text) {
          setInput(current => (current.trim() ? current : text))
        }
      } catch {
        // clipboard permission denied
      }
      try {
        const supabase = createClient()
        const cols = await fetchCloudCollections(supabase)
        if (!cancelled) setCollections(cols)
      } catch {
        // collections optional until preview
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, canSave])

  const setMediaAttachment = (kind: 'image' | 'video', file: File) => {
    clearAttachment()
    setAttachment({
      kind,
      file,
      previewUrl: URL.createObjectURL(file),
    })
    setError('')
  }

  const onPickPhoto = (file: File | null) => {
    if (file) setMediaAttachment('image', file)
  }

  const onPickVideo = (file: File | null) => {
    if (file) setMediaAttachment('video', file)
  }

  const onPickDocument = async (file: File | null) => {
    if (!file) return
    const kind = classifyQuickSaveFile(file.name, file.type)
    if (!kind) {
      setError(quickSaveFileUnsupportedMessage())
      return
    }
    if (kind === 'image') {
      setMediaAttachment('image', file)
      return
    }
    if (kind === 'video') {
      setMediaAttachment('video', file)
      return
    }
    if (kind === 'pdf') {
      clearAttachment()
      setAttachment({ kind: 'pdf', file })
      setError('')
      return
    }
    // note text → fill the compose box (mobile previewNoteFromContent path)
    try {
      const text = (await file.text()).trim()
      if (!text) {
        setError('That file is empty.')
        return
      }
      clearAttachment()
      setInput(text)
      setError('')
    } catch {
      setError('Could not read that file.')
    }
  }

  const goPreview = (next: Draft) => {
    setDraft(next)
    setSelectedCollection(autoSelectCollectionId(next.collection))
    setStep('preview')
    setStatus('')
  }

  const handleAnalyze = async () => {
    if (!canSave || saving || step === 'analyzing') return
    if (!attachment && !input.trim()) {
      setError('Paste a link, write a note, or add an attachment.')
      return
    }

    setError('')
    setStep('analyzing')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sign in with Trove Cloud to save on web.')
      const cols = await fetchCloudCollections(supabase).catch(() => collections)
      setCollections(cols)

      if (attachment?.kind === 'image') {
        setStatus('Uploading photo…')
        const imageUrl = await uploadMediaFile(supabase, user.id, attachment.file, 'image')
        const title = input.trim() || titleFromFileName(attachment.file.name) || 'Photo'
        setStatus('Organizing with AI…')
        let suggestion = { collection: 'Read Later', tags: [] as string[] }
        try {
          suggestion = await suggestForSave(
            { title, url: imageUrl, description: input.trim() || undefined },
            cols,
            { userId: user.id },
          )
        } catch { /* defaults */ }
        goPreview({
          url: '',
          type: 'image',
          title,
          description: input.trim(),
          imageUrl,
          collection: suggestion.collection,
          tags: suggestion.tags,
        })
        return
      }

      if (attachment?.kind === 'video') {
        setStatus('Uploading video…')
        const videoUrl = await uploadMediaFile(supabase, user.id, attachment.file, 'video')
        const title = input.trim() || titleFromFileName(attachment.file.name) || 'Video'
        setStatus('Organizing with AI…')
        let suggestion = { collection: 'Read Later', tags: [] as string[] }
        try {
          suggestion = await suggestForSave(
            { title, url: videoUrl, description: input.trim() || undefined },
            cols,
            { userId: user.id },
          )
        } catch { /* defaults */ }
        goPreview({
          url: videoUrl,
          type: 'video',
          title,
          description: input.trim(),
          collection: suggestion.collection,
          tags: suggestion.tags,
        })
        return
      }

      if (attachment?.kind === 'pdf') {
        setStatus('Uploading PDF…')
        const publicUrl = await uploadMediaFile(supabase, user.id, attachment.file, 'pdf')
        const title = titleFromFileName(attachment.file.name)
        goPreview({
          url: publicUrl,
          type: 'link',
          title,
          description: 'PDF Document',
          collection: 'Read Later',
          tags: ['pdf'],
        })
        return
      }

      const parsed = parseQuickSaveInput(input)
      if (parsed.kind === 'url' && parsed.url) {
        setStatus('Fetching page…')
        const meta = await fetchOGMetadata(parsed.url)
        const title = meta.title || defaultLinkTitle(parsed.url)
        const description = [parsed.contextText, meta.description].filter(Boolean).join('\n').trim()
        setStatus('Organizing with AI…')
        let suggestion = { collection: 'Read Later', tags: [] as string[] }
        try {
          suggestion = await suggestForSave(
            { title, url: parsed.url, description: description || undefined },
            cols,
            { userId: user.id },
          )
        } catch { /* defaults */ }
        goPreview({
          url: parsed.url,
          type: 'link',
          title,
          description: description || meta.description || '',
          imageUrl: meta.image,
          collection: suggestion.collection,
          tags: suggestion.tags,
        })
        return
      }

      const body = input.trim()
      setStatus('Thinking of a title…')
      let title = body.split('\n').map(l => l.trim()).find(Boolean)?.slice(0, 80) || 'Untitled note'
      try {
        const suggested = await suggestNoteTitle(body, { userId: user.id })
        if (suggested) title = suggested
      } catch { /* first-line title */ }
      goPreview({
        url: '',
        type: 'note',
        title,
        description: body,
        collection: 'Read Later',
        tags: [],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyze.')
      setStep('input')
      setStatus('')
    }
  }

  const handleConfirmSave = async () => {
    if (!draft || !canSave || saving) return
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sign in with Trove Cloud to save on web.')

      let collectionId: string | null = null
      if (selectedCollection) {
        const match = collections.find(c => c.name === selectedCollection)
        collectionId = match?.id ?? (await upsertCollectionByName(supabase, user.id, selectedCollection))
      }

      const save =
        draft.type === 'link'
          ? await insertQuickSaveLink(supabase, user.id, {
              url: draft.url,
              title: draft.title,
              description: draft.description,
              imageUrl: draft.imageUrl,
              tags: draft.tags,
              collectionId,
            })
          : draft.type === 'image'
            ? await insertQuickSaveImage(supabase, user.id, {
                title: draft.title,
                imageUrl: draft.imageUrl || '',
                description: draft.description,
                tags: draft.tags,
                collectionId,
              })
            : draft.type === 'video'
              ? await insertQuickSaveVideo(supabase, user.id, {
                  title: draft.title,
                  videoUrl: draft.url,
                  description: draft.description,
                  tags: draft.tags,
                  collectionId,
                })
              : await insertQuickSaveNote(supabase, user.id, {
                  title: draft.title,
                  content: draft.description,
                  tags: draft.tags,
                  collectionId,
                })

      playSuccess()
      close()
      router.push(saveDetailHref(save))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      setSaving(false)
    }
  }

  const removeTag = (tag: string) => {
    setDraft(d => (d ? { ...d, tags: d.tags.filter(t => t !== tag) } : d))
  }

  const addTag = () => {
    const next = tagDraft.trim().toLowerCase().replace(/^#/, '')
    if (!next || !draft) return
    if (!draft.tags.includes(next) && draft.tags.length < 5) {
      setDraft({ ...draft, tags: [...draft.tags, next] })
    }
    setTagDraft('')
    setShowTagInput(false)
  }

  const resetFileInput = (el: HTMLInputElement | null) => {
    if (el) el.value = ''
  }

  return (
    <>
      {/* FAB hidden — Quick Save opens from toolbar "Add new" via trove:open-quick-save */}

      {open ? (
        <div className={styles.backdrop} onClick={close}>
          <div
            className={styles.sheet}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-labelledby="quick-save-title"
          >
            {!canSave ? (
              <>
                <h2 id="quick-save-title">Quick Save</h2>
                <p className={styles.hint}>
                  Sign in with Trove Cloud to create saves on web. Demo and imported libraries are read-only.
                </p>
                <button type="button" className={styles.primaryBtn} onClick={close}>
                  Close
                </button>
              </>
            ) : step === 'analyzing' ? (
              <div className={styles.analyzing}>
                <div className={styles.analyzingOrb} aria-hidden>
                  <Sparkles size={20} color="#fff" />
                </div>
                <h2 id="quick-save-title" className={styles.analyzingTitle}>
                  Analyzing
                </h2>
                <p className={styles.status}>{status || 'Working…'}</p>
              </div>
            ) : step === 'preview' && draft ? (
              <>
                <h2 id="quick-save-title">Quick Save</h2>
                {draft.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.imageUrl} alt="" className={styles.heroImage} />
                ) : null}

                <label className={styles.field}>
                  Title
                  <input
                    type="text"
                    value={draft.title}
                    onChange={e => setDraft({ ...draft, title: e.target.value })}
                  />
                </label>

                <label className={styles.field}>
                  {draft.type === 'note' ? 'Note' : 'Description'}
                  <textarea
                    value={draft.description}
                    onChange={e => setDraft({ ...draft, description: e.target.value })}
                    rows={4}
                  />
                </label>

                <p className={styles.sectionLabel}>Save to</p>
                <div className={styles.chipRow}>
                  {collChips.map(chip => {
                    const on = selectedCollection === chip.id
                    return (
                      <button
                        key={chip.id || 'unsorted'}
                        type="button"
                        className={on ? styles.chipOn : styles.chip}
                        onClick={() => setSelectedCollection(chip.id)}
                      >
                        {chip.recommended ? <Sparkles size={12} /> : null}
                        {chip.label}
                      </button>
                    )
                  })}
                </div>

                <p className={styles.sectionLabel}>Tags</p>
                <div className={styles.chipRow}>
                  {draft.tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className={styles.tagChip}
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </button>
                  ))}
                  {draft.tags.length < 5 && !showTagInput ? (
                    <button
                      type="button"
                      className={styles.chip}
                      onClick={() => setShowTagInput(true)}
                    >
                      + add
                    </button>
                  ) : null}
                  {showTagInput ? (
                    <input
                      className={styles.tagInput}
                      value={tagDraft}
                      onChange={e => setTagDraft(e.target.value)}
                      placeholder="new tag"
                      autoFocus
                      onBlur={addTag}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                    />
                  ) : null}
                </div>

                {error ? <p className={styles.error}>{error}</p> : null}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={saving}
                    onClick={() => {
                      setStep('input')
                      setDraft(null)
                      setError('')
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={saving}
                    onClick={() => void handleConfirmSave()}
                  >
                    {saving ? 'Saving…' : saveLabel}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="quick-save-title">Quick Save</h2>
                <p className={styles.hint}>
                  Save links, notes, and photos for later — same as Trove mobile.
                </p>

                <label className={styles.field}>
                  <span className={styles.fieldTop}>
                    <span>Anything</span>
                    {kindLabel ? <span className={styles.kindBadge}>{kindLabel}</span> : null}
                  </span>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Paste a link or write a note…"
                    rows={7}
                    autoFocus
                  />
                </label>

                <p className={styles.attachSectionLabel}>Add attachment</p>
                <div className={styles.attachRow}>
                  <button
                    type="button"
                    className={styles.attachOptionBtn}
                    onClick={() => photoRef.current?.click()}
                    aria-label="Add photo"
                  >
                    <ImageIcon size={22} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className={styles.attachOptionBtn}
                    onClick={() => cameraRef.current?.click()}
                    aria-label="Take photo"
                  >
                    <Camera size={22} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className={styles.attachOptionBtn}
                    onClick={() => videoRef.current?.click()}
                    aria-label="Add video"
                  >
                    <Video size={22} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className={styles.attachOptionBtn}
                    onClick={() => fileRef.current?.click()}
                    aria-label="Add file"
                  >
                    <FileText size={22} strokeWidth={1.75} />
                  </button>
                </div>

                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={e => {
                    onPickPhoto(e.target.files?.[0] ?? null)
                    resetFileInput(e.target)
                  }}
                />
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className={styles.fileInput}
                  onChange={e => {
                    onPickPhoto(e.target.files?.[0] ?? null)
                    resetFileInput(e.target)
                  }}
                />
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  className={styles.fileInput}
                  onChange={e => {
                    onPickVideo(e.target.files?.[0] ?? null)
                    resetFileInput(e.target)
                  }}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept={QUICK_SAVE_DOCUMENT_ACCEPT}
                  className={styles.fileInput}
                  onChange={e => {
                    void onPickDocument(e.target.files?.[0] ?? null)
                    resetFileInput(e.target)
                  }}
                />

                {attachment?.kind === 'image' || attachment?.kind === 'video' ? (
                  <div className={styles.previewRow}>
                    {attachment.kind === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachment.previewUrl} alt="" className={styles.previewThumb} />
                    ) : (
                      <video src={attachment.previewUrl} className={styles.previewThumb} muted />
                    )}
                    <button
                      type="button"
                      className={styles.clearImage}
                      onClick={clearAttachment}
                      aria-label="Remove attachment"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : null}

                {attachment?.kind === 'pdf' ? (
                  <div className={styles.fileChip}>
                    <FileText size={16} />
                    <span>{attachment.file.name}</span>
                    <button type="button" onClick={clearAttachment} aria-label="Remove file">
                      <X size={14} />
                    </button>
                  </div>
                ) : null}

                {error ? <p className={styles.error}>{error}</p> : null}

                <div className={styles.actions}>
                  <button type="button" className={styles.secondaryBtn} onClick={close}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={!attachment && !input.trim()}
                    onClick={() => void handleAnalyze()}
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
