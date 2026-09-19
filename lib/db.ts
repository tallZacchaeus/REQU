import { Pool } from "pg"

/**
 * One pool for the process. Next reloads modules in development, so it is stashed on
 * globalThis — otherwise every edit leaks another pool until Postgres refuses connections.
 */
const globalForDb = globalThis as unknown as { requPool?: Pool }

export const pool =
  globalForDb.requPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  })

if (process.env.NODE_ENV !== "production") globalForDb.requPool = pool

/** Run a statement. Thin on purpose: the queries live with the code that needs them. */
export async function q<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
) {
  const r = await pool.query<T>(text, params)
  return r.rows
}

/** Everything inside, or nothing. Used wherever a change spans more than one table. */
export async function tx<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query("begin")
    const out = await fn(client)
    await client.query("commit")
    return out
  } catch (e) {
    await client.query("rollback").catch(() => undefined)
    throw e
  } finally {
    client.release()
  }
}
