/**
 * Applies any migration in db/migrations not yet recorded, in filename order, each in
 * its own transaction. Safe to run repeatedly — that is how deploys use it.
 */
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pool } from "../lib/db"

const DIR = resolve(process.cwd(), "db/migrations")

export async function migrate() {
  await pool.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz default now())",
  )
  const done = new Set(
    (await pool.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name),
  )
  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()

  let applied = 0
  for (const f of files) {
    if (done.has(f)) continue
    const client = await pool.connect()
    try {
      await client.query("begin")
      await client.query(readFileSync(resolve(DIR, f), "utf8"))
      await client.query("insert into schema_migrations(name) values ($1)", [f])
      await client.query("commit")
      console.log(`[migrate] applied ${f}`)
      applied++
    } catch (e) {
      await client.query("rollback").catch(() => undefined)
      throw new Error(`${f} failed: ${(e as Error).message}`)
    } finally {
      client.release()
    }
  }
  console.log(applied ? `[migrate] ${applied} applied` : "[migrate] already up to date")
}

if (process.argv[1]?.includes("migrate")) {
  migrate()
    .then(() => pool.end())
    .catch((e) => {
      console.error("[migrate]", e.message)
      process.exit(1)
    })
}
