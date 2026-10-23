'use client'

import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import {
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
  type McpTokenRow,
} from '@/lib/mcp/tokenActions'
import styles from './SettingsPage.module.css'

export default function AgentsMcpSection() {
  const [rows, setRows] = useState<McpTokenRow[]>([])
  const [label, setLabel] = useState('')
  const [freshToken, setFreshToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listMcpTokens()
      .then(setRows)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load tokens'))
  }, [])

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const created = await createMcpToken(label)
      setFreshToken(created.token)
      setLabel('')
      setRows(await listMcpTokens())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create token')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      await revokeMcpToken(id)
      setRows(await listMcpTokens())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not revoke token')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <span className={styles.iconWrap} aria-hidden>
          <Bot size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className={`serif ${styles.cardTitle}`}>Agents & MCP</h2>
          <p className={styles.cardDesc}>Let an agent search your library. Vault stays hidden.</p>
        </div>
      </header>

      <div className={styles.tokenCreate}>
        <input
          className={styles.tokenInput}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label, for example Cursor"
          maxLength={60}
          aria-label="Token label"
        />
        <button type="button" className={styles.primaryBtn} onClick={create} disabled={busy}>
          Create token
        </button>
      </div>

      {freshToken ? (
        <p className={styles.tokenOnce}>
          Copy this token now. It will not be shown again.
          <code className={styles.tokenCode}>{freshToken}</code>
        </p>
      ) : null}
      {error ? <p className={styles.tokenError}>{error}</p> : null}

      <ul className={styles.tokenList}>
        {rows.map((row) => (
          <li key={row.id} className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>{row.label || 'Personal token'}</p>
              <p className={styles.rowHint}>
                {row.token_prefix}… {row.revoked_at ? 'Revoked' : 'Active'}
              </p>
            </div>
            {row.revoked_at ? null : (
              <button type="button" className={styles.signOutBtn} onClick={() => revoke(row.id)} disabled={busy}>
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
