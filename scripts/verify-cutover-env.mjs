import fs from 'node:fs'

const path = process.argv[2] ?? '.env.vercel.cutover'
const t = fs.readFileSync(path, 'utf8')
const keys = [
  'DATABASE_URL',
  'NEON_AUTH_URL',
  'NEXT_PUBLIC_SYNC_MODE',
  'NEON_REALTIME_SECRET',
  'NEON_REALTIME_URL',
  'NEON_FN_SYNCWATCH_URL',
  'NEON_FN_AI_URL',
  'NEON_STORAGE_ENDPOINT',
  'NEXT_PUBLIC_NEON_STORAGE_ENDPOINT',
  'OPENAI_API_KEY',
]
for (const k of keys) {
  const m = t.match(new RegExp(`^${k}=(.*)$`, 'm'))
  if (!m) {
    console.log(`${k}: MISSING`)
    continue
  }
  let v = m[1].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  const hostMatch = v.match(/@([^/?]+)/) || v.match(/https?:\/\/([^/]+)/)
  const hint = hostMatch?.[1] ?? v.slice(0, 28)
  console.log(`${k}: ok hint=${hint} len=${v.length}`)
}
