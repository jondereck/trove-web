import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { decideOAuthAuthorization } from '@/lib/mcp/oauthActions'
import { createClient } from '@/lib/supabase/server'
import styles from '@/components/SettingsPage.module.css'

const SCOPE_LABELS: Record<string, string> = {
  'trove:read': 'Read your library. Vault stays hidden.',
  'trove:write': 'Save and organize items. Vault stays blocked.',
  openid: 'Confirm who you are',
  email: 'See your email address',
  profile: 'See your profile',
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>
}) {
  const authorizationId = (await searchParams).authorization_id
  if (!authorizationId) {
    return (
      <AppShell mode="cloud">
        <p className={styles.subtitle}>This authorization link is missing its id.</p>
      </AppShell>
    )
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`
    redirect(`/?next=${encodeURIComponent(next)}`)
  }

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
  if (error || !data) {
    return (
      <AppShell mode="cloud">
        <p className={styles.subtitle}>{error?.message ?? 'This authorization request is no longer valid.'}</p>
      </AppShell>
    )
  }

  if (!('authorization_id' in data)) redirect(data.redirect_url)

  const scopes = data.scope.split(' ').filter(Boolean)

  return (
    <AppShell mode="cloud">
      <div className={styles.page}>
        <h1 className={`serif ${styles.title}`}>Connect {data.client.name}</h1>
        <p className={styles.subtitle}>{data.user.email}</p>
        <section className={styles.card}>
          <p className={styles.cardDesc}>
            {data.client.name} is asking to use your Trove account. It will be sent back to {data.redirect_uri}.
          </p>
          <ul className={styles.tokenList}>
            {scopes.map((scope) => (
              <li key={scope} className={styles.row}>
                <div className={styles.rowCopy}>
                  <p className={styles.rowLabel}>{scope}</p>
                  <p className={styles.rowHint}>{SCOPE_LABELS[scope] ?? 'Requested by this app'}</p>
                </div>
              </li>
            ))}
          </ul>
          <form action={decideOAuthAuthorization} className={styles.tokenCreate}>
            <input type="hidden" name="authorization_id" value={authorizationId} />
            <button className={styles.primaryBtn} type="submit" name="decision" value="approve">
              Allow
            </button>
            <button className={styles.signOutBtn} type="submit" name="decision" value="deny">
              Deny
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  )
}
