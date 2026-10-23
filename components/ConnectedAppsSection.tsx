'use client'

import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import { listOAuthGrants, revokeOAuthGrant, type OAuthGrantRow } from '@/lib/mcp/oauthActions'
import styles from './SettingsPage.module.css'

export default function ConnectedAppsSection() {
  const [rows, setRows] = useState<OAuthGrantRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listOAuthGrants()
      .then(setRows)
      .catch(() => setRows([]))
  }, [])

  const revoke = async (clientId: string) => {
    setBusy(true)
    setError(null)
    try {
      await revokeOAuthGrant(clientId)
      setRows(await listOAuthGrants())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not revoke this app')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <span className={styles.iconWrap} aria-hidden>
          <Link2 size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className={`serif ${styles.cardTitle}`}>Connected apps</h2>
          <p className={styles.cardDesc}>Apps you allowed through OAuth. Personal tokens stay in Agents & MCP.</p>
        </div>
      </header>
      {error ? <p className={styles.tokenError}>{error}</p> : null}
      {rows.length === 0 && !error ? (
        <p className={styles.cardDesc}>No connected apps yet. They show up here after you allow Grok, Claude, or ChatGPT.</p>
      ) : null}
      <ul className={styles.tokenList}>
        {rows.map((row) => (
          <li key={row.clientId} className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>{row.name}</p>
              <p className={styles.rowHint}>{row.scopes.join(' ') || 'No scopes listed'}</p>
            </div>
            <button type="button" className={styles.signOutBtn} onClick={() => revoke(row.clientId)} disabled={busy}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
