import { createQueryBuilder, type QueryResult, type QueryState } from './query'

type SessionUser = { id: string; email: string; user_metadata: Record<string, unknown> }
type Session = { access_token: string; user: SessionUser }

type Listener = (event: string, session: Session | null) => void

export function createRemoteNeonClient(options: {
  apiUrl: string
  getToken: () => Promise<string | null>
  setToken: (token: string | null, user: SessionUser | null) => Promise<void>
}) {
  const listeners = new Set<Listener>()

  async function execute(state: QueryState): Promise<QueryResult> {
    const token = await options.getToken()
    const response = await fetch(`${options.apiUrl}/api/db`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ state }),
    })
    return response.json() as Promise<QueryResult>
  }

  async function publish(session: Session | null, event: string) {
    for (const listener of listeners) listener(event, session)
  }

  const db = createQueryBuilder(execute)
  return {
    ...db,
    auth: {
      async getSession() {
        const token = await options.getToken()
        if (!token) return { data: { session: null }, error: null }
        const response = await fetch(`${options.apiUrl}/api/auth/me`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = await response.json() as { user?: SessionUser | null }
        if (!body.user) {
          await options.setToken(null, null)
          return { data: { session: null }, error: null }
        }
        return { data: { session: { access_token: token, user: body.user } }, error: null }
      },
      async getUser() {
        const session = await this.getSession()
        return { data: { user: session.data.session?.user ?? null }, error: null }
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const response = await fetch(`${options.apiUrl}/api/auth/sign-in`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const body = await response.json() as { token?: string; user?: SessionUser; error?: string }
        if (!response.ok || !body.token || !body.user) {
          return { data: { user: null, session: null }, error: { message: body.error ?? 'Sign-in failed' } }
        }
        const user = { ...body.user, user_metadata: {} }
        await options.setToken(body.token, user)
        const session = { access_token: body.token, user }
        await publish(session, 'SIGNED_IN')
        return { data: { user, session }, error: null }
      },
      async signUp(input: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
        const response = await fetch(`${options.apiUrl}/api/auth/sign-up`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const body = await response.json() as { token?: string; user?: SessionUser; error?: string }
        if (!response.ok || !body.token || !body.user) {
          return { data: { user: null, session: null }, error: { message: body.error ?? 'Sign-up failed' } }
        }
        const user = { ...body.user, user_metadata: input.options?.data ?? {} }
        await options.setToken(body.token, user)
        const session = { access_token: body.token, user }
        await publish(session, 'SIGNED_IN')
        return { data: { user, session }, error: null }
      },
      async signOut() {
        const token = await options.getToken()
        await fetch(`${options.apiUrl}/api/auth/sign-out`, {
          method: 'POST',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).catch(() => undefined)
        await options.setToken(null, null)
        await publish(null, 'SIGNED_OUT')
        return { error: null }
      },
      async resetPasswordForEmail(email: string) {
        const response = await fetch(`${options.apiUrl}/api/auth/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const body = await response.json().catch(() => ({})) as { error?: string }
        return { data: {}, error: body.error ? { message: body.error } : null }
      },
      startAutoRefresh() {},
      stopAutoRefresh() {},
      async refreshSession() {
        return this.getSession()
      },
      onAuthStateChange(callback: Listener) {
        listeners.add(callback)
        void this.getSession().then((result) => callback('INITIAL_SESSION', result.data.session))
        return { data: { subscription: { unsubscribe() { listeners.delete(callback) } } } }
      },
      async signInWithOAuth(input?: { provider?: string }) {
        if (input?.provider && input.provider !== 'google') {
          return { data: { url: null }, error: { message: 'Use Google or email.' } }
        }
        const response = await fetch(`${options.apiUrl}/api/auth/google`, { credentials: 'include' })
        const body = await response.json().catch(() => ({})) as { url?: string; error?: string }
        if (!response.ok || !body.url) {
          return { data: { url: null }, error: { message: body.error ?? 'Could not start Google sign-in.' } }
        }
        if (typeof window !== 'undefined') window.location.assign(body.url)
        return { data: { url: body.url }, error: null }
      },
      async exchangeCodeForSession() {
        return { error: { message: 'Use email sign-in.' } }
      },
      async updateUser() {
        return { data: { user: null }, error: null }
      },
    },
    channel() {
      return { on() { return this }, subscribe() { return this } }
    },
    removeChannel() {},
    storage: {
      from() {
        return {
          async upload(path: string, body: ArrayBuffer, fileOptions?: { contentType?: string }) {
            const token = await options.getToken()
            const response = await fetch(`${options.apiUrl}/api/media`, {
              method: 'POST',
              headers: {
                'Content-Type': fileOptions?.contentType ?? 'application/octet-stream',
                'X-Media-Path': path,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body,
            })
            if (!response.ok) {
              const payload = await response.json().catch(() => ({})) as { error?: string }
              return { error: { message: payload.error ?? 'Upload failed' } }
            }
            return { error: null }
          },
          getPublicUrl(path: string) {
            const endpoint = (process.env.NEXT_PUBLIC_NEON_STORAGE_ENDPOINT
              || process.env.EXPO_PUBLIC_NEON_STORAGE_ENDPOINT
              || '').replace(/\/$/, '')
            const bucket = (process.env.NEXT_PUBLIC_NEON_STORAGE_BUCKET
              || process.env.EXPO_PUBLIC_NEON_STORAGE_BUCKET
              || 'media').trim()
            const publicUrl = endpoint
              ? `${endpoint}/${bucket}/${path.replace(/^\/+/, '')}`
              : `${options.apiUrl}/api/media/${path}`
            return { data: { publicUrl } }
          },
        }
      },
    },
  }
}
