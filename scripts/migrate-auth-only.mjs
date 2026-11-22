import pg from 'pg'

const sourceUrl = process.env.SOURCE_DATABASE_URL
const destUrl = process.env.DEST_DATABASE_URL
if (!sourceUrl || !destUrl) {
  console.error('SOURCE_DATABASE_URL and DEST_DATABASE_URL required')
  process.exit(1)
}

async function copyTable(src, dest, schema, table) {
  console.log(`copying ${table}…`)
  const colsRes = await src.query(
    `select column_name from information_schema.columns
     where table_schema = $1 and table_name = $2
     order by ordinal_position`,
    [schema, table],
  )
  const cols = colsRes.rows.map((r) => r.column_name)
  const destCols = await dest.query(
    `select column_name from information_schema.columns
     where table_schema = $1 and table_name = $2`,
    [schema, table],
  )
  if (!destCols.rows.length) {
    console.log('skip', table)
    return
  }
  const destSet = new Set(destCols.rows.map((r) => r.column_name))
  const useCols = cols.filter((c) => destSet.has(c))
  const selectList = useCols.map((c) => `"${c}"`).join(', ')
  const { rows } = await src.query(`select ${selectList} from ${schema}."${table}"`)
  if (!rows.length) {
    console.log(`${table}: 0`)
    return
  }
  const placeholders = useCols.map((_, i) => `$${i + 1}`).join(', ')
  const insert = `insert into ${schema}."${table}" (${selectList}) values (${placeholders}) on conflict do nothing`
  for (const row of rows) {
    const values = useCols.map((c) => {
      const v = row[c]
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !Buffer.isBuffer(v)) {
        return JSON.stringify(v)
      }
      return v
    })
    try {
      await dest.query(insert, values)
    } catch (err) {
      console.error(`fail ${table}:`, err.message)
      throw err
    }
  }
  console.log(`${table}: ${rows.length}`)
}

const preferred = [
  'user',
  'session',
  'account',
  'verification',
  'jwks',
  'organization',
  'member',
  'invitation',
  'project_config',
  'oauthClient',
  'oauthResource',
  'oauthClientResource',
  'oauthConsent',
  'oauthAccessToken',
  'oauthRefreshToken',
  'oauthClientAssertion',
]

const src = new pg.Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } })
const dest = new pg.Client({ connectionString: destUrl, ssl: { rejectUnauthorized: false } })
await src.connect()
await dest.connect()
try {
  const authTables = await src.query(
    `select tablename from pg_tables where schemaname = 'neon_auth' order by 1`,
  )
  const names = authTables.rows.map((r) => r.tablename)
  const ordered = [
    ...preferred.filter((n) => names.includes(n)),
    ...names.filter((n) => !preferred.includes(n)),
  ]
  const required = new Set(['user', 'session', 'account', 'verification'])
  for (const table of ordered) {
    try {
      await copyTable(src, dest, 'neon_auth', table)
    } catch (err) {
      if (required.has(table)) throw err
      console.warn(`skip optional ${table}: ${err.message}`)
    }
  }
} finally {
  await src.end()
  await dest.end()
}
console.log('auth copy done')
