# Trove Neon Functions

Slugs are `[a-z0-9]{1,20}` (no hyphens):

| Slug | Role |
|------|------|
| `syncwatch` | Cross-device watermarks |
| `ai` | OpenAI proxy |
| `og` | OG HTML fetch |
| `rcwebhook` | RevenueCat → entitlements |
| `neonbackup` | Neon → Supabase backup (cron Trigger) |

Deploy (from `trove-web`):

```powershell
npm run neon:functions:deploy
```

Requires `neon` CLI + auth, project `icy-band-39501038`, branch `br-rapid-credit-az3xmnqm`.

Set on Vercel (optional reverse-proxy):

- `NEON_FN_SYNCWATCH_URL`
- `NEON_FN_AI_URL`
- `NEON_FN_OG_URL`
- `NEON_FN_RCWEBHOOK_URL`
- or `NEON_FUNCTIONS_BASE_URL` if your cell uses a shared base path
