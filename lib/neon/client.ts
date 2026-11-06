import { cookies } from 'next/headers'
import { dropSession, linkAppUser, neonEmailAuth, openSession, readSession } from './accounts'
import { SESSION_COOKIE } from './env'
import { neonPool } from './pool'
import { createQueryBuilder, runQuery, type QueryResult, type QueryState } from './query'

async function sessionFromRequest(request?: Request) {
  const header = request?.headers.get('authorization') ?? ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : null
  if (bearer) return readSession(bearer)
  const jar = await cookies()
  return readSession(jar.get(SESSION_COOKIE)?.value)
}

export async function neonUserId(request?: Request): Promise<string | null> {
  const session = await sessionFromRequest(request)
  return session?.appUserId ?? null
}

async function execute(state: QueryState, request?: Request): Promise<QueryResult> {
  const userId = await neonUserId(request)
  const pool = neonPool()
  return runQuery((sql, params) => pool.query(sql, params), state, userId)
}

function authApi(request?: Request) {
  return {
    async getSession() {
      const session = await sessionFromRequest(request)
      if (!session) return { data: { session: null }, error: null }
      return {
        data: {
          session: {
            access_token: session.token,
            user: { id: session.appUserId, email: session.email, user_metadata: {} },
          },
        },
        error: null,
      }
    },
    async getUser() {
      const session = await this.getSession()
      return { data: { user: session.data.session?.user ?? null }, error: null }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const result = await neonEmailAuth('sign-in/email', { email, password })
      if (result.error || !result.user) return { data: { user: null, session: null }, error: { message: result.error ?? 'Sign-in failed' } }
      const appUserId = await linkAppUser(result.user)
      const token = await openSession(appUserId, result.user.email)
      return {
        data: {
          user: { id: appUserId, email: result.user.email, user_metadata: {} },
          session: { access_token: token, user: { id: appUserId, email: result.user.email } },
        },
        error: null,
      }
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      const result = await neonEmailAuth('sign-up/email', { email, password, name: options?.data?.full_name })
      if (result.error || !result.user) return { data: { user: null, session: null }, error: { message: result.error ?? 'Sign-up failed' } }
      const appUserId = await linkAppUser(result.user)
      const token = await openSession(appUserId, result.user.email)
      return {
        data: {
          user: { id: appUserId, email: result.user.email, user_metadata: options?.data ?? {} },
          session: { access_token: token, user: { id: appUserId, email: result.user.email } },
        },
        error: null,
      }
    },
    async signOut() {
      const session = await sessionFromRequest(request)
      await dropSession(session?.token)
      return { error: null }
    },
    async resetPasswordForEmail(email: string) {
      const result = await neonEmailAuth('request-password-reset', { email, redirectTo: process.env.NEXT_PUBLIC_SITE_URL ?? '' })
      return { data: {}, error: result.error ? { message: result.error } : null }
    },
    startAutoRefresh() {},
    stopAutoRefresh() {},
    async refreshSession() {
      return this.getSession()
    },
    onAuthStateChange(callback: (event: string, session: unknown) => void) {
      void this.getSession().then((result) => callback('INITIAL_SESSION', result.data.session))
      return { data: { subscription: { unsubscribe() {} } } }
    },
    async signInWithOAuth() {
      return { data: { url: null }, error: { message: 'Sign in with email and set a new password. Your existing library stays on that email.' } }
    },
    async exchangeCodeForSession() {
      return { data: { session: null }, error: { message: 'Use email sign-in.' } }
    },
    async updateUser() {
      return { data: { user: null }, error: null }
    },
  }
}

export async function createNeonClient(request?: Request) {
  const db = createQueryBuilder((state) => execute(state, request))
  return {
    ...db,
    auth: authApi(request),
    channel() {
      return { on() { return this }, subscribe() { return this } }
    },
    removeChannel() {},
    storage: { from() { return { upload: async () => ({ error: { message: 'Use /api/media' } }), getPublicUrl: () => ({ data: { publicUrl: '' } }) } } },
  }
}
