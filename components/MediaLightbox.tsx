'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './MediaLightbox.module.css'

type Props = {
  url: string | null
  kind?: 'image' | 'video'
  onClose: () => void
}

export default function MediaLightbox({ url, kind = 'image', onClose }: Props) {
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, onClose])

  if (!url) return null

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Media preview"
      onClick={onClose}
    >
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        <X size={22} strokeWidth={2} />
      </button>
      <div onClick={e => e.stopPropagation()}>
        {kind === 'video' ? (
          <video className={styles.video} src={url} controls autoPlay playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={styles.media} />
        )}
      </div>
    </div>
  )
}
