# Trove Web agent rules

## Icons (hard rule)

Do not recreate brand or platform icons (App Store, Google Play, social logos) as
hand-drawn SVGs or CSS shapes. Use `react-icons/si` for monochrome marks and
`@iconify/react` (`logos:*`) for multicolor brand icons — see
`components/StoreBadgeLinks.tsx`. UI chrome uses Lucide. Never use emoji as icons in
product UI.

## Mobile is the source of truth (hard rule)

**Always check Trove Mobile first** (`../trove` / **Trove Mobile** workspace root)
before designing or changing Library, Collections, Quick Save, selection mode, or
save detail on web.

| Concern | Mobile (wins) | Web (follows) |
|---------|---------------|---------------|
| Save types, schema | `trove/types/index.ts` | `trove-web/lib/types.ts` |
| Library filters, chips | `trove/lib/libraryFilterChips.ts` | `trove-web/lib/libraryFilterChips.ts` |
| Save card layout | `trove/components/SaveCard.tsx` | `trove-web/components/SaveCard.tsx` |
| Long-press → mass selection | Library / collection `SelectionModeHeader` + `SelectionActionBar` | Same flow on web Library + collection detail |
| Checklist UI | `trove/components/NoteBodyEditor.tsx` | Never show raw `- [ ]` on web |
| Quick Save steps | input → Analyzing → preview confirm | Match mobile; do not skip confirm |
| Design tokens | `trove/constants/theme.ts` | `trove-web/lib/theme.ts` + `--trove-*` |
| Cloud data | Neon PG18 (`DATABASE_URL`, Neon Auth, Neon media) | Same Neon project. Supabase is not the live store |

When mobile and web disagree on UX, **update web, not mobile** (see `trove/AGENTS.md` § Trove Web).

## Data backend (hard rule)

Trove Web’s live store is **Neon**. Library, collections, auth, media, sync, and MCP reads use Neon when `NEXT_PUBLIC_DATA_BACKEND` is unset, `neon`, or any value other than `supabase`. A missing `DATABASE_URL` throws. It does not fall through to Supabase.

Set `NEXT_PUBLIC_DATA_BACKEND=supabase` only to use the legacy project on purpose.

Supabase writes (RevenueCat entitlement mirror and the Neon → Supabase backup) run only when `SUPABASE_MIRROR=1`. URL and service-role keys alone do not write. The backup route, `lib/neon/backup.ts`, and `neon-functions/neonbackup` stay in the repo so the PG17 mirror can be turned back on. Rollback: set `SUPABASE_MIRROR=1` (Vercel and the `neonbackup` function env, with the Supabase URL and service role), redeploy `neonbackup`, and re-enable the Neon schedule trigger `nightly-neon-backup` on branch `br-bitter-butterfly-azoh2wfn`. Vercel cron `/api/cron/neon-backup` copies again once the flag is set.

`scripts/sync-web-env.ps1` (in the mobile repo) copies optional mirror keys. It must not replace `DATABASE_URL` or flip the data backend.

Before porting a feature:

1. Read the mobile screen (`trove/app/…`) and shared components (`SelectionActionBar`, `QuickSave`, etc.).
2. Port **pure** logic first (no React Native imports); add `node:test` in `trove-web/lib/`.
3. Match existing web chrome (`AppShell`, `FilterBar`, `SaveCard`, tokens) — no one-off layouts.

See also `.cursor/rules/parity-with-mobile.mdc`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
