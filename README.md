# Trove Web

Browser companion for [Trove](https://github.com/jondereck/trove) — sign in with your Cloud account and browse your synced library on a second PC.

## Cursor workspace (Mobile + Web)

Open both repos in one Cursor window:

```powershell
cursor C:\Users\jonde\trove.code-workspace
```

Or **File → Open Workspace from File…** → `trove.code-workspace` (in your `jonde` folder).

Optional Supabase mirror keys (does not switch the database off Neon):

```powershell
cd C:\Users\jonde\trove
.\scripts\sync-web-env.ps1
```

See `trove/docs/superpowers/specs/2026-08-31-cursor-dual-repo-workspace.md`.

Phase A: email login, read-only library, demo mode, JSON import preview, future-ready shell (OAuth stubs, FAB, sounds toggle, disabled nav).

## Setup

```powershell
cd C:\Users\jonde\trove-web
copy .env.local.example .env.local
```

Fill `.env.local` for **Neon** (the live store). Leave `NEXT_PUBLIC_DATA_BACKEND` unset or set it to `neon`. Set `DATABASE_URL` and `NEON_AUTH_URL`. Supabase URL and anon key are optional and do nothing for Library, auth, media, or sync unless you set `NEXT_PUBLIC_DATA_BACKEND=supabase` on purpose. Copies into Supabase run only when `SUPABASE_MIRROR=1`.

```
DATABASE_URL=
NEON_AUTH_URL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Legacy Supabase OAuth redirect list** (only if `NEXT_PUBLIC_DATA_BACKEND=supabase`): add:

- `http://localhost:3000/auth/callback`
- `https://web-trove.vercel.app/auth/callback`

Or run (with a [Supabase access token](https://supabase.com/dashboard/account/tokens)):

```powershell
cd C:\Users\jonde\trove-web
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
.\scripts\configure-supabase-oauth.ps1
```

Enable Google and Apple providers in Supabase before using those buttons.

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

Next.js 16, Neon Postgres + Neon Auth, CSS Modules (Phase A screens) + **Tailwind CSS v4 + shadcn/ui** (foundation for Phase B/C). Supabase client code remains for an explicit `NEXT_PUBLIC_DATA_BACKEND=supabase` rollback.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests (`lib/**/*.test.ts`) |

## Docs

- Spec: `../trove/docs/superpowers/specs/2026-08-31-trove-web-mvp-design.md`
- Plan: `../trove/docs/superpowers/plans/2026-08-31-trove-web-phase-a.md`

## Deploy (Vercel)

1. Import `jondereck/trove-web` on Vercel
2. Set `DATABASE_URL`, `NEON_AUTH_URL`, and `NEXT_PUBLIC_SITE_URL`. Leave `NEXT_PUBLIC_DATA_BACKEND` unset (Neon). Do not set `SUPABASE_MIRROR` unless you want the PG17 copy.
3. Neon Auth redirect URLs must include `https://<your-domain>/auth/callback`

## Parallel development

Keep mobile (`trove`) and web (`trove-web`) in separate Cursor windows. Schema changes on the Neon project must be reflected in web queries manually until a shared package exists.
