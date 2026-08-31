'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { insertQuickSaveLink, insertQuickSaveNote } from '@/lib/quickSave'
import { saveDetailHref } from '@/lib/saveDetailCore'
import { playSuccess } from '@/lib/sounds'
import type { SessionMode } from '@/lib/sessionMode'
import styles from './QuickSaveFab.module.css'

type Tab = 'note' | 'link'

type Props = {
  mode: SessionMode
}

export default function QuickSaveFab({ mode }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canSave = mode === 'cloud'

  const reset = () => {
    setTitle('')
    setBody('')
    setUrl('')
    setLinkTitle('')
    setError('')
    setTab('note')
  }

  const close = () => {
    setOpen(false)
    reset()
  }

  const handleSave = async () => {
    if (!canSave || busy) return
    setError('')
    setBusy(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sign in with Trove Cloud to save on web.')

      const save =
        tab === 'note'
          ? await insertQuickSaveNote(supabase, user.id, { title, content: body })
          : await insertQuickSaveLink(supabase, user.id, { url, title: linkTitle || undefined })

      playSuccess()
      close()
      router.push(saveDetailHref(save))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        aria-label="Quick Save"
        onClick={() => setOpen(true)}
      >
        +
      </button>

      {open ? (
        <div className={styles.backdrop} onClick={close}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="quick-save-title">
            <h2 id="quick-save-title">Quick Save</h2>
            {!canSave ? (
              <p className={styles.hint}>
                Sign in with Trove Cloud to create saves on web. Demo and imported libraries are read-only.
              </p>
            ) : (
              <>
                <div className={styles.tabs}>
                  <button
                    type="button"
                    className={tab === 'note' ? styles.tabActive : styles.tab}
                    onClick={() => setTab('note')}
                  >
                    Note
                  </button>
                  <button
                    type="button"
                    className={tab === 'link' ? styles.tabActive : styles.tab}
                    onClick={() => setTab('link')}
                  >
                    Link
                  </button>
                </div>

                {tab === 'note' ? (
                  <div className={styles.form}>
                    <label className={styles.field}>
                      Title
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Note title"
                      />
                    </label>
                    <label className={styles.field}>
                      Body
                      <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Write your note…"
                        rows={6}
                      />
                    </label>
                  </div>
                ) : (
                  <div className={styles.form}>
                    <label className={styles.field}>
                      URL
                      <input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://"
                      />
                    </label>
                    <label className={styles.field}>
                      Title (optional)
                      <input
                        type="text"
                        value={linkTitle}
                        onChange={e => setLinkTitle(e.target.value)}
                        placeholder="Defaults to site name"
                      />
                    </label>
                  </div>
                )}

                {error ? <p className={styles.error}>{error}</p> : null}

                <div className={styles.actions}>
                  <button type="button" className={styles.secondaryBtn} onClick={close}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={busy || (tab === 'link' && !url.trim())}
                    onClick={() => void handleSave()}
                  >
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}

            {!canSave ? (
              <button type="button" className={styles.primaryBtn} onClick={close}>
                Close
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
