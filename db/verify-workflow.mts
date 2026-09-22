/**
 * Drives a requisition through the whole workflow against a real database, and tries the
 * moves that must be refused. Run against a scratch database.
 */
import { pool, q } from "../lib/db"
import { createDraft, move, getFor, listFor, saveEdits } from "../lib/requisitions"
import type { Actor } from "../lib/authz"

let failed = 0
const ok = (pass: boolean, what: string) => { if (!pass) failed++; console.log(`  ${pass ? "PASS" : "FAIL"}  ${what}`) }
const refused = async (fn: () => Promise<unknown>, what: string) => {
  try { await fn(); ok(false, what + " (it was ALLOWED)") } catch { ok(true, what) }
}


/** These checks make their own people. They must never depend on seeded demo accounts. */
async function fixture(email: string, role: string, name: string, dept?: string) {
  let departmentId: number | null = null
  if (dept) {
    const d = await q<{ id: number }>(
      "insert into departments(name) values ($1) on conflict (name) do update set name=excluded.name returning id", [dept])
    departmentId = d[0]!.id
  }
  const r = await q<{ id: number }>(
    `insert into people(email, full_name, initials, role, department_id, active)
     values ($1,$2,'XX',$3,$4,true)
     on conflict (email) do update set role=excluded.role, department_id=excluded.department_id, active=true
     returning id`, [email, name, role, departmentId])
  return r[0]!.id
}

const who = async (email: string): Promise<Actor> => {
  const r = await q<{ id: number; role: string; department_id: number | null }>(
    "select id, role, department_id from people where email=$1", [email])
  return { id: r[0]!.id, role: r[0]!.role as Actor["role"], departmentId: r[0]!.department_id }
}

await fixture("check.hod@example.invalid", "hod", "Check HOD", "Check Department")
await fixture("check.ayp@example.invalid", "ayp", "Check ANYP")
await fixture("check.nyp@example.invalid", "nyp", "Check NYP")
await fixture("check.fin@example.invalid", "finance", "Check Finance")

const hod = await who("check.hod@example.invalid")
const ayp = await who("check.ayp@example.invalid")
const nyp = await who("check.nyp@example.invalid")
const fin = await who("check.fin@example.invalid")

const id = await createDraft(hod, {
  programme: "Verification Rally",
  programmeDate: "2026-11-01",
  location: "Lagos",
  purpose: "Checking the rules hold",
  items: [{ description: "Hall", amount: 250000 }, { description: "Feeding", amount: 120000 }],
})
ok(!!id, "a HOD raises a draft")
ok((await getFor(hod, id))?.items.length === 2, "its expense lines are stored")
ok((await getFor(ayp, id)) === null, "a reviewer cannot see a draft")

await refused(() => move(ayp, id, { to: "awaiting_approval" }), "the ANYP cannot act on a draft")
await refused(() => move(hod, id, { to: "approved" }), "a HOD cannot approve their own requisition")
await refused(() => move(hod, id, { to: "disbursed" }), "a HOD cannot disburse to themselves")

await move(hod, id, { to: "under_review" })
ok((await getFor(hod, id))?.status === "under_review", "submitting moves it under review")
ok((await getFor(ayp, id)) !== null, "now the ANYP can see it")
ok(!!(await getFor(hod, id))?.submittedAt, "the submission is timestamped")

await refused(() => saveEdits(hod, id, { programme: "Sneaky", items: [] }), "the owner cannot edit once it is under review")
await refused(() => move(nyp, id, { to: "approved" }), "the NYP cannot approve before it is recommended")
await refused(() => move(ayp, id, { to: "changes_requested" }), "returning it without saying what to change is refused")

await move(ayp, id, { to: "changes_requested", requestedChanges: ["Break down the feeding figure"] })
ok((await getFor(hod, id))?.comments.length === 1, "the reason is recorded as a comment")
await saveEdits(hod, id, { programme: "Verification Rally", items: [{ description: "Hall", amount: 250000 }] })
ok((await getFor(hod, id))?.items.length === 1, "the owner can edit again once it is returned")

await move(hod, id, { to: "under_review" })
await move(ayp, id, { to: "awaiting_approval" })
await refused(() => move(ayp, id, { to: "approved" }), "the ANYP still cannot give final approval")
await move(nyp, id, { to: "approved" })
await refused(() => move(fin, id, { to: "disbursed" }), "Finance cannot skip its own processing step")
await move(fin, id, { to: "with_finance" })
await move(fin, id, { to: "disbursed", paymentRef: "TRF-99812" })
ok((await getFor(fin, id))?.paymentRef === "TRF-99812", "the payment reference is kept")

await refused(() => move(fin, id, { to: "reconciled" }), "Finance cannot close it before the HOD files anything")
await move(hod, id, { to: "reconciliation_review" })
await refused(() => move(hod, id, { to: "reconciled" }), "the HOD cannot sign off their own reconciliation")
await move(fin, id, { to: "reconciled" })

const done = await getFor(hod, id)
ok(done?.status === "reconciled", "Finance closes it")
ok(Object.keys(done?.stageDates ?? {}).length === 5, `all five stages are stamped (${Object.keys(done?.stageDates ?? {}).length})`)
ok((done?.activity.length ?? 0) >= 8, `the activity trail records every step (${done?.activity.length})`)
await refused(() => move(hod, id, { to: "under_review" }), "a closed requisition cannot be reopened")

const outsiderId = await fixture("check.outsider@example.invalid", "hod", "Check Outsider", "Elsewhere")
const outsiderDept = await q<{ department_id: number }>("select department_id from people where id=$1", [outsiderId])
const stranger: Actor = { id: outsiderId, role: "hod", departmentId: outsiderDept[0]!.department_id }
ok((await getFor(stranger, id)) === null, "a HOD in another department cannot open it")
ok((await listFor(stranger)).length === 0, "and it does not appear in their list")

await pool.end()
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed")
process.exit(failed ? 1 : 0)
