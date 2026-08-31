# Trove Web

Browser companion for [Trove](https://github.com/jondereck/trove) — sign in with your Cloud account and browse your synced library on a second PC.

## Cursor workspace (Mobile + Web)

Open both repos in one Cursor window:

```powershell
cursor C:\Users\jonde\trove.code-workspace
```

Or **File → Open Workspace from File…** → `trove.code-workspace` (in your `jonde` folder).

Sync Supabase keys from mobile:

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

Fill `.env.local` with the **same** Supabase project as mobile (`EXPO_PUBLIC_*` names work too):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**OAuth (Google / Apple):** In Supabase Dashboard → Authentication → URL configuration, add:

- `http://localhost:3000/auth/callback`
- `https://<your-vercel-domain>/auth/callback`

Enable Google and Apple providers in Supabase before using those buttons.

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

Next.js 16, Supabase SSR auth, CSS Modules (Phase A screens) + **Tailwind CSS v4 + shadcn/ui** (foundation for Phase B/C).

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
2. Set the three `NEXT_PUBLIC_*` env vars
3. Add `https://<your-domain>/auth/callback` to Supabase Auth redirect URLs (Phase B OAuth)

## Parallel development

Keep mobile (`trove`) and web (`trove-web`) in separate Cursor windows. Schema changes in mobile `supabase/migrations` must be reflected in web types/queries manually until a shared package exists.
