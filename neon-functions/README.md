# Trove Neon Functions

Slugs are `[a-z0-9]{1,20}` (no hyphens):

| Slug | Role |
|------|------|
| `syncwatch` | Cross-device watermarks |
| `ai` | Neon AI Gateway chat (`gpt-5-mini`) |
| `jev` | Neon AI Gateway Decisions (TypeSafe Jev) |
| `og` | OG HTML fetch |
| `rcwebhook` | RevenueCat → entitlements |
| `neonbackup` | Neon → Supabase PG17 mirror. Skips unless `SUPABASE_MIRROR=1`. Schedule trigger `nightly-neon-backup` stays disabled until that rollback. |

Deploy (from `trove-web`):

```powershell
npm run neon:functions:deploy
```

Requires `neon` CLI + auth, project `purple-surf-65228849` (PG18), branch `br-bitter-butterfly-azoh2wfn`.

Set on Vercel (optional reverse-proxy):

- `NEON_FN_SYNCWATCH_URL`
- `NEON_FN_AI_URL`
- `NEON_FN_JEV_URL`
- `NEON_FN_OG_URL`
- `NEON_FN_RCWEBHOOK_URL`
- or `NEON_FUNCTIONS_BASE_URL` if your cell uses a shared base path
