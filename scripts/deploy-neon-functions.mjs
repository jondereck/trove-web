/**
 * Bundle + deploy Neon Functions via esbuild + Neon MCP-compatible zip.
 * Usage: node scripts/deploy-neon-functions.mjs
 * Or: neon functions deploy <slug> --src neon-functions/<slug>/index.ts ...
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const projectId = process.env.NEON_PROJECT_ID ?? 'icy-band-39501038'
const branchId = process.env.NEON_BRANCH_ID ?? 'br-rapid-credit-az3xmnqm'
const slugs = ['syncwatch', 'ai', 'og', 'rcwebhook', 'neonbackup']

const require = createRequire(import.meta.url)

function whichNeon() {
  try {
    execFileSync('neon', ['--version'], { stdio: 'pipe' })
    return 'neon'
  } catch {
    return null
  }
}

const neonBin = whichNeon()
if (!neonBin) {
  console.error('neon CLI not found. Install: npm i -g neonctl  (or use npx neon)')
  process.exit(1)
}

const outRoot = join(root, 'neon-functions', '.dist')
mkdirSync(outRoot, { recursive: true })

for (const slug of slugs) {
  const src = join(root, 'neon-functions', slug, 'index.ts')
  if (!existsSync(src)) {
    console.error('missing', src)
    process.exit(1)
  }
  console.log(`Deploying ${slug}…`)
  const args = [
    'functions',
    'deploy',
    slug,
    '--src',
    src,
    '--project-id',
    projectId,
    '--branch',
    branchId,
    '--wait',
  ]
  if (slug === 'ai' && process.env.OPENAI_API_KEY) {
    args.push('--env', `OPENAI_API_KEY=${process.env.OPENAI_API_KEY}`)
  }
  if (slug === 'rcwebhook') {
    if (process.env.RC_WEBHOOK_SECRET) args.push('--env', `RC_WEBHOOK_SECRET=${process.env.RC_WEBHOOK_SECRET}`)
    if (process.env.RC_API_KEY) args.push('--env', `RC_API_KEY=${process.env.RC_API_KEY}`)
  }
  if (slug === 'neonbackup') {
    if (process.env.CRON_SECRET) args.push('--env', `CRON_SECRET=${process.env.CRON_SECRET}`)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      args.push('--env', `SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
    }
    const sb =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
    if (sb) args.push('--env', `NEXT_PUBLIC_SUPABASE_URL=${sb}`)
  }
  try {
    execFileSync(neonBin, args, { stdio: 'inherit', cwd: root })
  } catch (error) {
    console.error(`Failed ${slug}`, error)
    process.exit(1)
  }
}

writeFileSync(
  join(outRoot, 'deployed.json'),
  JSON.stringify({ projectId, branchId, slugs, at: new Date().toISOString() }, null, 2),
)
console.log('Done.')
