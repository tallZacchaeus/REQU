import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { q, tx } from "./db"
import type { Role } from "./data"

export const SESSION_COOKIE = "requ_session"
const TOKEN_MINUTES = 15
const SESSION_DAYS = 14

/** A secret is required. Falling back to a default would make every session forgeable. */
function secret() {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters")
  }
  return s
}

const sha = (v: string) => createHash("sha256").update(v).digest("hex")
const sign = (id: string) => createHmac("sha256", secret()).update(id).digest("base64url")

/** `<id>.<signature>`, so a tampered id is rejected without a database round trip. */
export function sealSessionId(id: string) {
  return `${id}.${sign(id)}`
}
export function unsealSessionId(raw: string | undefined): string | null {
  if (!raw) return null
  const dot = raw.lastIndexOf(".")
  if (dot < 1) return null
  const id = raw.slice(0, dot)
  const given = raw.slice(dot + 1)
  const want = sign(id)
  if (given.length !== want.length) return null
  return timingSafeEqual(Buffer.from(given), Buffer.from(want)) ? id : null
}

export interface Person {
  id: number
  email: string
  full_name: string
  short_name: string | null
  initials: string | null
  role: Role
  title: string | null
  scope: string | null
  department_id: number | null
}

/* ── Sign-in links ──────────────────────────────────────────────────── */

/**
 * Mint a link for an address, or return null when nobody active holds it. The caller must
 * answer the same way either way: telling a stranger whether an address exists here is a
 * gift to anyone guessing at who works for the church.
 */
export async function createLoginToken(email: string, ip?: string) {
  const people = await q<Person>(
    "select id, email, full_name, short_name, initials, role, title, scope, department_id from people where lower(email)=lower($1) and active",
    [email.trim()],
  )
  const person = people[0]
  if (!person) return null

  const token = randomBytes(32).toString("base64url")
  await q(
    "insert into login_tokens(token_hash, person_id, expires_at, requested_ip) values ($1,$2,now() + ($3 || ' minutes')::interval,$4)",
    [sha(token), person.id, String(TOKEN_MINUTES), ip ?? null],
  )
  return { token, person, minutes: TOKEN_MINUTES }
}

export type RedeemResult =
  | { ok: true; person: Person; sessionId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" }

/**
 * Redeem a link and open a session, in one transaction. The update is conditional on
 * used_at still being null, so two clicks racing each other cannot both win.
 */
export async function redeemLoginToken(token: string, meta: { ip?: string; userAgent?: string }): Promise<RedeemResult> {
  const hash = sha(token)
  return tx(async (c) => {
    const found = await c.query<{ person_id: number; expires_at: Date; used_at: Date | null }>(
      "select person_id, expires_at, used_at from login_tokens where token_hash=$1 for update",
      [hash],
    )
    const row = found.rows[0]
    if (!row) return { ok: false, reason: "invalid" as const }
    if (row.used_at) return { ok: false, reason: "used" as const }
    if (new Date(row.expires_at) < new Date()) return { ok: false, reason: "expired" as const }

    const claimed = await c.query("update login_tokens set used_at=now() where token_hash=$1 and used_at is null", [hash])
    if (claimed.rowCount !== 1) return { ok: false, reason: "used" as const }

    const person = (
      await c.query<Person>(
        "select id, email, full_name, short_name, initials, role, title, scope, department_id from people where id=$1 and active",
        [row.person_id],
      )
    ).rows[0]
    if (!person) return { ok: false, reason: "invalid" as const }

    const id = randomBytes(24).toString("base64url")
    await c.query(
      "insert into sessions(id, person_id, expires_at, user_agent, ip) values ($1,$2,now() + ($3 || ' days')::interval,$4,$5)",
      [id, person.id, String(SESSION_DAYS), meta.userAgent ?? null, meta.ip ?? null],
    )
    return { ok: true as const, person, sessionId: id }
  })
}

/* ── Sessions ───────────────────────────────────────────────────────── */

/** The signed-in person, or null. Expired rows are ignored and swept lazily. */
export async function personFromSession(sealed: string | undefined): Promise<Person | null> {
  const id = unsealSessionId(sealed)
  if (!id) return null
  const rows = await q<Person & { expires_at: Date }>(
    `select p.id, p.email, p.full_name, p.short_name, p.initials, p.role, p.title, p.scope, p.department_id, s.expires_at
       from sessions s join people p on p.id = s.person_id
      where s.id=$1 and s.expires_at > now() and p.active`,
    [id],
  )
  const person = rows[0]
  if (!person) return null
  // Sliding expiry, but only written once an hour: every request updating a row would
  // turn a read into a write for no benefit anyone can perceive.
  await q(
    `update sessions set last_seen_at=now(), expires_at=now() + ($2 || ' days')::interval
      where id=$1 and last_seen_at < now() - interval '1 hour'`,
    [id, String(SESSION_DAYS)],
  ).catch(() => undefined)
  return person
}

export async function destroySession(sealed: string | undefined) {
  const id = unsealSessionId(sealed)
  if (id) await q("delete from sessions where id=$1", [id])
}

/* ── Rate limiting ──────────────────────────────────────────────────── */

/**
 * True when the caller is still within the allowance for this key. The window is computed
 * here rather than in SQL: a fixed bucket is easy to reason about, and the counter is a
 * single upsert whatever the traffic.
 */
export async function withinLimit(key: string, max: number, windowMinutes: number) {
  const ms = windowMinutes * 60_000
  const windowStart = new Date(Math.floor(Date.now() / ms) * ms)
  const rows = await q<{ count: number }>(
    `insert into rate_limits(key, window_start, count) values ($1,$2,1)
     on conflict (key, window_start) do update set count = rate_limits.count + 1
     returning count`,
    [key, windowStart],
  )
  return (rows[0]?.count ?? 1) <= max
}

/** Old counters and dead tokens. Called opportunistically, not on a schedule. */
export async function sweep() {
  await q("delete from rate_limits where window_start < now() - interval '1 day'").catch(() => undefined)
  await q("delete from login_tokens where expires_at < now() - interval '7 days'").catch(() => undefined)
  await q("delete from sessions where expires_at < now()").catch(() => undefined)
}
