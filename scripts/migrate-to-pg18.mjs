/**
 * Schema+data copy SOURCE_DATABASE_URL → DEST_DATABASE_URL (Neon PG17 → PG18).
 * Creates missing public tables from source column metadata, then copies rows.
 */
import pg from 'pg'

const sourceUrl = process.env.SOURCE_DATABASE_URL
const destUrl = process.env.DEST_DATABASE_URL
if (!sourceUrl || !destUrl) {
  console.error('SOURCE_DATABASE_URL and DEST_DATABASE_URL required')
  process.exit(1)
}

const PUBLIC_ORDER = [
  'users',
  'profiles',
  'collections',
  'saves',
  'vault_meta',
  'save_reminders',
  'collection_shares',
  'collection_share_members',
  'daily_tasks',
  'trove_mcp_tokens',
  'app_sessions',
  'auth_links',
  'entitlements',
  'google_nonces',
  'media_objects',
  'api_transfer_events',
]

function mapType(row) {
  const udt = row.udt_name
  if (udt === 'uuid') return 'uuid'
  if (udt === 'text') return 'text'
  if (udt === 'bool') return 'boolean'
  if (udt === 'int4') return 'integer'
  if (udt === 'int8') return 'bigint'
  if (udt === 'jsonb') return 'jsonb'
  if (udt === 'json') return 'json'
  if (udt === 'timestamptz') return 'timestamptz'
  if (udt === 'timestamp') return 'timestamp'
  if (udt === '_text') return 'text[]'
  if (udt === '_uuid') return 'uuid[]'
  if (udt === 'bytea') return 'bytea'
  if (udt === 'numeric') return 'numeric'
  if (udt === 'float8') return 'double precision'
  if (udt === 'float4') return 'real'
  return row.data_type === 'ARRAY' ? 'text[]' : row.data_type
}

async function ensurePublicTable(src, dest, table) {
  const exists = await dest.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = $1`,
    [table],
  )
  if (exists.rows.length) return

  const cols = await src.query(
    `select column_name, data_type, udt_name, is_nullable, column_default
     from information_schema.columns
     where table_schema = 'public' and table_name = $1
     order by ordinal_position`,
    [table],
  )
  if (!cols.rows.length) return

  const parts = cols.rows.map((row) => {
    let def = `"${row.column_name}" ${mapType(row)}`
    if (row.is_nullable === 'NO') def += ' not null'
    // Skip expression defaults that may reference missing sequences; keep now()/literals.
    const d = row.column_default
    if (d && !d.includes('nextval') && !d.includes('auth.')) {
      def += ` default ${d}`
    }
    return def
  })

  const pk = await src.query(
    `select a.attname
     from pg_index i
     join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
     where i.indrelid = ('public.' || quote_ident($1))::regclass and i.indisprimary`,
    [table],
  )
  if (pk.rows.length) {
    parts.push(`primary key (${pk.rows.map((r) => `"${r.attname}"`).join(', ')})`)
  }

  await dest.query(`create table public."${table}" (${parts.join(', ')})`)
  console.log(`created public.${table}`)
}

async function copyTable(src, dest, schema, table) {
  const colsRes = await src.query(
    `select column_name from information_schema.columns
     where table_schema = $1 and table_name = $2
     order by ordinal_position`,
    [schema, table],
  )
  const cols = colsRes.rows.map((r) => r.column_name)
  if (!cols.length) {
    console.log(`skip missing ${schema}.${table}`)
    return 0
  }
  const destCols = await dest.query(
    `select column_name from information_schema.columns
     where table_schema = $1 and table_name = $2`,
    [schema, table],
  )
  if (!destCols.rows.length) {
    console.log(`skip no dest ${schema}.${table}`)
    return 0
  }
  const destSet = new Set(destCols.rows.map((r) => r.column_name))
  const useCols = cols.filter((c) => destSet.has(c))
  const selectList = useCols.map((c) => `"${c}"`).join(', ')
  const { rows } = await src.query(`select ${selectList} from ${schema}."${table}"`)
  if (!rows.length) {
    console.log(`${schema}.${table}: 0`)
    return 0
  }
  const placeholders = useCols.map((_, i) => `$${i + 1}`).join(', ')
  const insert = `insert into ${schema}."${table}" (${selectList}) values (${placeholders}) on conflict do nothing`
  for (const row of rows) {
    await dest.query(
      insert,
      useCols.map((c) => row[c]),
    )
  }
  console.log(`${schema}.${table}: ${rows.length}`)
  return rows.length
}

async function main() {
  const src = new pg.Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } })
  const dest = new pg.Client({ connectionString: destUrl, ssl: { rejectUnauthorized: false } })
  await src.connect()
  await dest.connect()
  try {
    await dest.query('create extension if not exists pgcrypto')
    await dest.query('create extension if not exists pg_trgm')

    for (const table of PUBLIC_ORDER) {
      await ensurePublicTable(src, dest, table)
    }
    for (const table of PUBLIC_ORDER) {
      await copyTable(src, dest, 'public', table)
    }

    const authPreferred = [
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
    const authTables = await src.query(
      `select tablename from pg_tables where schemaname = 'neon_auth' order by 1`,
    )
    const names = authTables.rows.map((r) => r.tablename)
    const ordered = [
      ...authPreferred.filter((n) => names.includes(n)),
      ...names.filter((n) => !authPreferred.includes(n)),
    ]
    for (const tablename of ordered) {
      await copyTable(src, dest, 'neon_auth', tablename)
    }
  } finally {
    await src.end()
    await dest.end()
  }
  console.log('migrate-to-pg18 done')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
