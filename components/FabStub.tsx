'use client'

import { useState } from 'react'
import styles from './FabStub.module.css'

export default function FabStub() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className={styles.fab} aria-label="Quick Save" onClick={() => setOpen(true)}>
        +
      </button>
      {open ? (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <h2>Quick Save — coming soon to web</h2>
            <p>Use Trove on your phone to save links, notes, photos, and more. Web Quick Save is planned for a later phase.</p>
            <button type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      ) : null}
    </>
  )
}
