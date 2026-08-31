# Trove Web agent rules

## Icons (hard rule)

Do not recreate brand or platform icons (App Store, Google Play, social logos) as
hand-drawn SVGs or CSS shapes. Use `react-icons/si` for monochrome marks and
`@iconify/react` (`logos:*`) for multicolor brand icons — see
`components/StoreBadgeLinks.tsx`. UI chrome uses Lucide. Never use emoji as icons in
product UI.

See `trove/AGENTS.md` for mobile ↔ web parity (Library, Collections, tokens).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
