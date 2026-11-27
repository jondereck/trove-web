#!/usr/bin/env node
/**
 * Re-fetch OG for link saves with lookaside/fbsbx or empty thumbnails.
 * Usage: node scripts/backfill-fb-thumbs.mjs [--apply] [--limit=50]
 */
import pg from 'pg'

const { Client } = pg
const apply = process.argv.includes('--apply')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : 50
const apiBase = process.env.TROVE_WEB_URL ?? 'http://localhost:3000'
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('DATABASE_URL required')
  process.exit(1)
}

const client = new Client({ connectionString: databaseUrl })
await client.connect()

const { rows } = await client.query(
  `select id, url, title, image_url
   from public.saves
   where type = 'link'
     and (deleted_at is null)
     and url is not null
     and (
       image_url is null
       or image_url ilike '%lookaside.%'
       or image_url ilike '%fbsbx.com%'
     )
   order by created_at desc
   limit $1`,
  [limit],
)

console.log(`${apply ? 'APPLY' : 'DRY-RUN'}: ${rows.length} candidate(s)`)

for (const row of rows) {
  const label = `${row.id.slice(0, 8)}… ${row.url?.slice(0, 60)}`
  if (!apply) {
    console.log(`  skip (dry-run) ${label}`)
    continue
  }
  try {
    const res = await fetch(`${apiBase}/api/og`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: row.url }),
    })
  if (!res.ok) {
      console.warn(`  og ${res.status} ${label}`)
      continue
    }
    const preview = await res.json()
    if (!preview?.image || preview.image === row.image_url) {
      console.log(`  no new image ${label}`)
      continue
    }
    await client.query('update public.saves set image_url = $2 where id = $1::uuid', [row.id, preview.image])
    console.log(`  updated ${label} -> ${preview.image.slice(0, 50)}…`)
  } catch (error) {
    console.warn(`  error ${label}`, error instanceof Error ? error.message : error)
  }
}

await client.end()