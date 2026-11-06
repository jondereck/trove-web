import pg from 'pg'
import { databaseUrl } from './env'

const globalPool = globalThis as unknown as { troveNeonPool?: pg.Pool }

export function neonPool(): pg.Pool {
  if (!globalPool.troveNeonPool) {
    globalPool.troveNeonPool = new pg.Pool({
      connectionString: databaseUrl(),
      ssl: { rejectUnauthorized: false },
      max: 4,
    })
  }
  return globalPool.troveNeonPool
}
