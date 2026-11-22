/**
 * Copy Neon Object Storage media PG17 → PG18 using Neon MCP-style presign URLs
 * passed as JSON on stdin: { downloads: [{key,url,headers}], uploads: [{key,url,headers,contentType}] }
 *
 * Simpler path used by the agent: this script is driven by env COPY_KEYS +
 * neon CLI is not required — the agent fetches/presigns via MCP and this
 * script only does HTTP copy when given a manifest file.
 *
 * Usage: node scripts/copy-media-pg18.mjs path/to/manifest.json
 */
import { readFileSync } from 'node:fs'

const path = process.argv[2]
if (!path) {
  console.error('usage: node scripts/copy-media-pg18.mjs manifest.json')
  process.exit(1)
}
const manifest = JSON.parse(readFileSync(path, 'utf8'))
let ok = 0
let fail = 0
for (const item of manifest.items) {
  try {
    const getRes = await fetch(item.downloadUrl, { headers: item.downloadHeaders ?? {} })
    if (!getRes.ok) throw new Error(`GET ${getRes.status}`)
    const bytes = Buffer.from(await getRes.arrayBuffer())
    const putHeaders = { ...(item.uploadHeaders ?? {}) }
    if (item.contentType) putHeaders['Content-Type'] = item.contentType
    const putRes = await fetch(item.uploadUrl, {
      method: 'PUT',
      headers: putHeaders,
      body: bytes,
    })
    if (!putRes.ok) throw new Error(`PUT ${putRes.status} ${await putRes.text()}`)
    ok += 1
    console.log(`ok ${item.key} (${bytes.length}b)`)
  } catch (err) {
    fail += 1
    console.error(`fail ${item.key}: ${err instanceof Error ? err.message : err}`)
  }
}
console.log(JSON.stringify({ ok, fail }))
if (fail) process.exit(1)
