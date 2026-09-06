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
| Supabase project | `trove/.env.local` | Same URL + anon key (`scripts/sync-web-env.ps1`) |

When mobile and web disagree on UX, **update web, not mobile** (see `trove/AGENTS.md` § Trove Web).

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
