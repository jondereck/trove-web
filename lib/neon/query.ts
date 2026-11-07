const IDENT = /^[a-z_][a-z0-9_]*$/

export type QueryFilter =
  | { kind: 'cmp'; op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike' | 'like'; column: string; value: unknown }
  | { kind: 'is'; column: string; value: null | boolean }
  | { kind: 'in'; column: string; value: unknown[] }
  | { kind: 'not'; column: string; operator: string; value: unknown }
  | { kind: 'or'; raw: string }

export type QueryState = {
  table: string
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  columns: string
  head: boolean
  countExact: boolean
  filters: QueryFilter[]
  orders: { column: string; ascending: boolean }[]
  range: { from: number; to: number } | null
  limit: number | null
  single: 'none' | 'single' | 'maybe'
  values: Record<string, unknown> | Record<string, unknown>[] | null
  onConflict: string | null
  rpc: { fn: string; args: Record<string, unknown> } | null
}

export type QueryResult = {
  data: unknown
  error: { message: string } | null
  count: number | null
}

export function emptyState(table: string): QueryState {
  return {
    table,
    action: 'select',
    columns: '*',
    head: false,
    countExact: false,
    filters: [],
    orders: [],
    range: null,
    limit: null,
    single: 'none',
    values: null,
    onConflict: null,
    rpc: null,
  }
}

export function assertIdent(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Invalid column ${name}`)
  return name
}

const TABLES = new Set([
  'profiles',
  'collections',
  'saves',
  'vault_meta',
  'save_reminders',
  'collection_shares',
  'collection_share_members',
  'daily_tasks',
  'trove_mcp_tokens',
])

export function assertTable(name: string): string {
  if (!TABLES.has(name)) throw new Error(`Unknown table ${name}`)
  return name
}

const OWNER: Record<string, string> = {
  profiles: 'id',
  collections: 'user_id',
  saves: 'user_id',
  vault_meta: 'user_id',
  save_reminders: 'user_id',
  collection_shares: 'owner_id',
  daily_tasks: 'user_id',
  trove_mcp_tokens: 'user_id',
}

export function scopedState(state: QueryState, userId: string): QueryState {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Bad user id')
  if (state.rpc) return state
  if (state.table === 'collection_share_members') {
    return {
      ...state,
      filters: [
        ...state.filters,
        { kind: 'or', raw: `owner_id.eq.${userId},user_id.eq.${userId}` },
      ],
    }
  }
  const owner = OWNER[state.table]
  if (!owner) return state
  const next: QueryState = {
    ...state,
    filters: state.filters.filter((filter) => !('column' in filter) || filter.column !== owner),
  }
  if (state.action === 'insert' || state.action === 'upsert') {
    const rows = Array.isArray(state.values) ? state.values : state.values ? [state.values] : []
    const stamped = rows.map((row) => ({ ...row, [owner]: userId }))
    next.values = Array.isArray(state.values) ? stamped : stamped[0] ?? null
    return next
  }
  next.filters = [...next.filters, { kind: 'cmp', op: 'eq', column: owner, value: userId }]
  return next
}

function pushValue(values: unknown[], value: unknown): string {
  values.push(value)
  return `$${values.length}`
}

function cmpSql(op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike' | 'like'): string {
  switch (op) {
    case 'eq': return '='
    case 'neq': return '<>'
    case 'gt': return '>'
    case 'gte': return '>='
    case 'lt': return '<'
    case 'lte': return '<='
    case 'ilike': return 'ilike'
    case 'like': return 'like'
    default: {
      const neverOp: never = op
      return neverOp
    }
  }
}

function orParts(raw: string, values: unknown[]): string {
  const pieces = raw.split(',').map((part) => part.trim()).filter(Boolean)
  const sql = pieces.map((part) => {
    const match = part.match(/^([a-z_][a-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|ilike|like|is)\.(.*)$/)
    if (!match) throw new Error('Unsupported or filter')
    const column = assertIdent(match[1])
    const op = match[2]
    const rawValue = match[3]
    if (op === 'is') {
      return `${column} is ${rawValue === 'null' ? 'null' : 'not null'}`
    }
    const placeholder = pushValue(values, rawValue)
    return `${column} ${cmpSql(op as 'eq')} ${placeholder}`
  })
  return `(${sql.join(' or ')})`
}

export function whereSql(state: QueryState, values: unknown[]): string {
  const parts = state.filters.map((filter) => {
    if (filter.kind === 'or') return orParts(filter.raw, values)
    const column = assertIdent(filter.column)
    if (filter.kind === 'in') {
      if (filter.value.length === 0) return 'false'
      const holders = filter.value.map((item) => pushValue(values, item))
      return `${column} in (${holders.join(', ')})`
    }
    if (filter.kind === 'is') {
      if (filter.value === null) return `${column} is null`
      return `${column} is ${filter.value ? 'true' : 'false'}`
    }
    if (filter.kind === 'not') {
      if (filter.operator === 'is' && filter.value === null) return `${column} is not null`
      const placeholder = pushValue(values, filter.value)
      return `not (${column} = ${placeholder})`
    }
    const placeholder = pushValue(values, filter.value)
    return `${column} ${cmpSql(filter.op)} ${placeholder}`
  })
  return parts.length ? ` where ${parts.join(' and ')}` : ''
}

function valueFor(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return JSON.stringify(value)
  }
  return value
}

const RPC_ARGS: Record<string, string[]> = {
  search_saves: ['terms'],
  /** Inline GROUP BY — not a Postgres function; handled below. */
  collection_save_counts: [],
  mcp_resolve_token: ['p_token_hash'],
  mcp_list_collections: ['p_user_id'],
  mcp_get_save: ['p_user_id', 'p_save_id'],
  mcp_list_collection_saves: ['p_user_id', 'p_collection_id', 'p_limit'],
  mcp_list_reminders: ['p_user_id'],
  mcp_search_saves: ['p_user_id', 'p_query', 'p_limit'],
}

export async function runQuery(
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>,
  state: QueryState,
  userId: string | null,
): Promise<QueryResult> {
  try {
    if (state.rpc) {
      if (!RPC_ARGS[state.rpc.fn]) throw new Error('Unknown function')
      const names = RPC_ARGS[state.rpc.fn]
      const args = { ...state.rpc.args }
      if (names.includes('p_user_id')) {
        if (!userId) return { data: null, error: { message: 'Not signed in' }, count: null }
        args.p_user_id = userId
      }
      if (state.rpc.fn === 'search_saves') {
        if (!userId) return { data: null, error: { message: 'Not signed in' }, count: null }
        const result = await query(
          'select * from public.search_saves($1::text[]) where user_id = $2::uuid',
          [args.terms ?? [], userId],
        )
        return { data: result.rows, error: null, count: result.rows.length }
      }
      if (state.rpc.fn === 'collection_save_counts') {
        if (!userId) return { data: null, error: { message: 'Not signed in' }, count: null }
        // One aggregated row per folder — avoids shipping every save's collection_id
        // through Vercel (was ~548 rows × multi-second /api/db on mobile Cloud).
        const result = await query(
          `select collection_id, count(*)::int as count
           from public.saves
           where user_id = $1::uuid
             and collection_id is not null
             and is_inbox = false
             and coalesce(is_vault, false) = false
           group by collection_id`,
          [userId],
        )
        return { data: result.rows, error: null, count: result.rows.length }
      }
      const params = names.map((name) => args[name])
      const holders = names.map((_, index) => `$${index + 1}`)
      const result = await query(
        `select * from public.${assertIdent(state.rpc.fn)}(${holders.join(', ')})`,
        params,
      )
      const data = result.rows.length === 1 && result.rows[0] && typeof result.rows[0] === 'object' && Object.keys(result.rows[0] as object).length === 1
        ? Object.values(result.rows[0] as object)[0]
        : result.rows
      return { data, error: null, count: null }
    }

    if (!userId && (OWNER[state.table] || state.table === 'collection_share_members')) {
      return { data: null, error: { message: 'Not signed in' }, count: null }
    }
    const scoped = userId ? scopedState(state, userId) : state
    assertTable(scoped.table)
    const params: unknown[] = []
    const where = whereSql(scoped, params)

    if (scoped.action === 'select' && scoped.head) {
      const result = await query(`select count(*)::int as n from public.${scoped.table}${where}`, params)
      const count = Number((result.rows[0] as { n: number }).n)
      return { data: null, error: null, count }
    }

    if (scoped.action === 'delete') {
      await query(`delete from public.${scoped.table}${where}`, params)
      return { data: null, error: null, count: null }
    }

    if (scoped.action === 'update') {
      const row = (scoped.values ?? {}) as Record<string, unknown>
      const keys = Object.keys(row)
      if (keys.length === 0) return { data: null, error: null, count: null }
      const sets = keys.map((key) => {
        assertIdent(key)
        return `${key} = ${pushValue(params, valueFor(row[key]))}`
      })
      const result = await query(
        `update public.${scoped.table} set ${sets.join(', ')}${where} returning *`,
        params,
      )
      return shapeRows(result.rows, scoped)
    }

    if (scoped.action === 'insert' || scoped.action === 'upsert') {
      const rows = Array.isArray(scoped.values) ? scoped.values : [scoped.values ?? {}]
      const keys = Object.keys(rows[0] ?? {})
      keys.forEach(assertIdent)
      const inserted: unknown[] = []
      for (const row of rows) {
        const holders = keys.map((key) => pushValue(params, valueFor(row[key])))
        let sql = `insert into public.${scoped.table} (${keys.join(', ')}) values (${holders.join(', ')})`
        if (scoped.action === 'upsert' && scoped.onConflict) {
          const conflict = scoped.onConflict.split(',').map((part) => assertIdent(part.trim()))
          const updates = keys
            .filter((key) => !conflict.includes(key))
            .map((key) => `${key} = excluded.${key}`)
          sql += ` on conflict (${conflict.join(', ')}) do update set ${updates.join(', ')}`
        }
        sql += ' returning *'
        const result = await query(sql, params.splice(0, params.length))
        inserted.push(...result.rows)
        params.length = 0
      }
      return shapeRows(inserted, scoped)
    }

    let sql = `select ${scoped.countExact ? '*' : scoped.columns} from public.${scoped.table}${where}`
    if (scoped.orders.length) {
      sql += ` order by ${scoped.orders.map((order) => `${assertIdent(order.column)} ${order.ascending ? 'asc' : 'desc'}`).join(', ')}`
    }
    if (scoped.range) {
      sql += ` offset ${Math.max(0, scoped.range.from)} limit ${scoped.range.to - scoped.range.from + 1}`
    } else if (scoped.limit != null) {
      sql += ` limit ${Math.max(0, scoped.limit)}`
    }
    const result = await query(sql, params)
    let count: number | null = null
    if (scoped.countExact) {
      const counted = await query(`select count(*)::int as n from public.${scoped.table}${where}`, params)
      count = Number((counted.rows[0] as { n: number }).n)
    }
    const shaped = shapeRows(result.rows, scoped)
    return { ...shaped, count: count ?? shaped.count }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed'
    return { data: null, error: { message }, count: null }
  }
}

function shapeRows(rows: unknown[], state: QueryState): QueryResult {
  if (state.single === 'single') {
    if (rows.length !== 1) return { data: null, error: { message: 'Expected one row' }, count: rows.length }
    return { data: rows[0], error: null, count: 1 }
  }
  if (state.single === 'maybe') {
    if (rows.length > 1) return { data: null, error: { message: 'Expected one row' }, count: rows.length }
    return { data: rows[0] ?? null, error: null, count: rows.length }
  }
  return { data: rows, error: null, count: rows.length }
}

export function createQueryBuilder(
  execute: (state: QueryState) => Promise<QueryResult>,
) {
  function builder(state: QueryState) {
    const api = {
      select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
        return builder({
          ...state,
          columns,
          countExact: options?.count === 'exact' || state.countExact,
          head: options?.head === true,
        })
      },
      eq(column: string, value: unknown) {
        return builder({ ...state, filters: [...state.filters, { kind: 'cmp', op: 'eq', column, value }] })
      },
      neq(column: string, value: unknown) {
        return builder({ ...state, filters: [...state.filters, { kind: 'cmp', op: 'neq', column, value }] })
      },
      gt(column: string, value: unknown) {
        return builder({ ...state, filters: [...state.filters, { kind: 'cmp', op: 'gt', column, value }] })
      },
      gte(column: string, value: unknown) {
        return builder({ ...state, filters: [...state.filters, { kind: 'cmp', op: 'gte', column, value }] })
      },
      lt(column: string, value: unknown) {
        return builder({ ...state, filters: [...state.filters, { kind: 'cmp', op: 'lt', column, value }] })
      },
      lte(column: string, value: unknown) {
        return builder({ ...state, filters: [...state.filters, { kind: 'cmp', op: 'lte', column, value }] })
      },
      ilike(column: string, value: unknown) {
        return builder({ ...state, filters: [...state.filters, { kind: 'cmp', op: 'ilike', column, value }] })
      },
      in(column: string, value: unknown[]) {
        return builder({ ...state, filters: [...state.filters, { kind: 'in', column, value }] })
      },
      is(column: string, value: null | boolean) {
        return builder({ ...state, filters: [...state.filters, { kind: 'is', column, value }] })
      },
      not(column: string, operator: string, value: unknown) {
        return builder({ ...state, filters: [...state.filters, { kind: 'not', column, operator, value }] })
      },
      or(raw: string) {
        return builder({ ...state, filters: [...state.filters, { kind: 'or', raw }] })
      },
      order(column: string, options?: { ascending?: boolean }) {
        return builder({
          ...state,
          orders: [...state.orders, { column, ascending: options?.ascending !== false }],
        })
      },
      range(from: number, to: number) {
        return builder({ ...state, range: { from, to } })
      },
      limit(count: number) {
        return builder({ ...state, limit: count })
      },
      maybeSingle() {
        return builder({ ...state, single: 'maybe' })
      },
      single() {
        return builder({ ...state, single: 'single' })
      },
      insert(values: Record<string, unknown> | Record<string, unknown>[]) {
        return builder({ ...state, action: 'insert', values })
      },
      update(values: Record<string, unknown>) {
        return builder({ ...state, action: 'update', values })
      },
      delete() {
        return builder({ ...state, action: 'delete' })
      },
      upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
        return builder({
          ...state,
          action: 'upsert',
          values,
          onConflict: options?.onConflict ?? 'id',
        })
      },
      then(resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) {
        return execute(state).then(resolve, reject)
      },
    }
    return api
  }

  return {
    from(table: string) {
      return builder(emptyState(table))
    },
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      return execute({ ...emptyState('saves'), rpc: { fn, args } })
    },
  }
}
