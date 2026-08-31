'use client'

import styles from './SaveVideoPlayer.module.css'

type Props = {
  src: string
  poster?: string
}

export default function SaveVideoPlayer({ src, poster }: Props) {
  return (
    <div className={styles.wrap}>
      <video
        className={styles.video}
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
      />
    </div>
  )
}
