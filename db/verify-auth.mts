/**
 * Checks the sign-in machinery against a real database. Run against a scratch database,
 * never a live one — it creates tokens and sessions and then throws them away.
 *
 *   DATABASE_URL=... SESSION_SECRET=... npm run verify:auth
 *
 * These are the parts where a quiet mistake is expensive: a link that can be replayed, a
 * session id that can be forged, a limit that does not hold.
 */
import {
  createLoginToken, redeemLoginToken, personFromSession,
  sealSessionId, destroySession, withinLimit,
} from "../lib/auth"
import { pool, q } from "../lib/db"

let failed = 0
const ok = (pass: boolean, what: string) => {
  if (!pass) failed++
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${what}`)
}

const WHO = "check.signin@example.invalid"
// Its own person, so this never depends on demo accounts being seeded.
await q(`insert into people(email, full_name, initials, role, active)
         values ($1,'Check Signin','CS','hod',true)
         on conflict (email) do update set active=true`, [WHO])

const issued = await createLoginToken(WHO, "1.2.3.4")
ok(!!issued, "a link is issued for a real address")
ok((await createLoginToken("nobody@example.com")) === null, "no link for an address nobody holds")

const first = await redeemLoginToken(issued!.token, { ip: "1.2.3.4" })
ok(first.ok, "the link signs the person in")
ok(first.ok && first.person.email === WHO, "and it is the person who asked")

const again = await redeemLoginToken(issued!.token, {})
ok(!again.ok && again.reason === "used", "the same link cannot be used twice")
ok(!(await redeemLoginToken("not-a-real-token", {})).ok, "a made-up token is refused")

const sessionId = first.ok ? first.sessionId : ""
const sealed = sealSessionId(sessionId)
ok((await personFromSession(sealed))?.email === WHO, "a sealed session resolves to the person")
ok((await personFromSession(sessionId)) === null, "an unsigned session id is refused")
ok((await personFromSession(sealed.slice(0, -2) + "xx")) === null, "a tampered signature is refused")

await destroySession(sealed)
ok((await personFromSession(sealed)) === null, "signing out ends the session")

let allowed = 0
for (let i = 0; i < 8; i++) if (await withinLimit(`probe-${process.pid}`, 5, 15)) allowed++
ok(allowed === 5, `the limit stops at its allowance (let ${allowed} of 8 through)`)

const later = await createLoginToken(WHO)
await pool.query("update login_tokens set expires_at = now() - interval '1 minute' where used_at is null")
const stale = await redeemLoginToken(later!.token, {})
ok(!stale.ok && stale.reason === "expired", "an expired link is refused")

await pool.end()
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed")
process.exit(failed ? 1 : 0)
