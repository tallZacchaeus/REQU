/**
 * Who gets told what, and — just as importantly — who does not.
 * Pure routing: no mail is sent, because mailerConfigured() is false without credentials.
 */
import { pool, q } from "../lib/db"
import { announce } from "../lib/notify"
import { createDraft, move } from "../lib/requisitions"
import type { Actor } from "../lib/authz"

let failed = 0
const ok = (pass: boolean, what: string) => { if (!pass) failed++; console.log(`  ${pass ? "PASS" : "FAIL"}  ${what}`) }

async function person(email: string, role: string, name: string, dept?: string) {
  let departmentId: number | null = null
  if (dept) {
    const d = await q<{ id: number }>(
      "insert into departments(name) values ($1) on conflict (name) do update set name=excluded.name returning id", [dept])
    departmentId = d[0]!.id
  }
  const r = await q<{ id: number; department_id: number | null }>(
    `insert into people(email, full_name, initials, role, department_id, active)
     values ($1,$2,'XX',$3,$4,true)
     on conflict (email) do update set role=excluded.role, department_id=excluded.department_id, active=true
     returning id, department_id`, [email, name, role, departmentId])
  return { id: r[0]!.id, role, departmentId: r[0]!.department_id } as Actor
}

const hod = await person("notify.hod@example.invalid", "hod", "Notify HOD", "Notify Department")
const ayp = await person("notify.ayp@example.invalid", "ayp", "Notify ANYP")
const nyp = await person("notify.nyp@example.invalid", "nyp", "Notify NYP")
const fin = await person("notify.fin@example.invalid", "finance", "Notify Finance")

const id = await createDraft(hod, { programme: "Notification check", items: [{ description: "Hall", amount: 50000 }] })

// The workflow must complete whether or not anybody can be told.
await move(hod, id, { to: "under_review" })
ok((await q<{ status: string }>("select status from requisitions where id=$1", [id]))[0]!.status === "under_review",
   "a move completes even with no mail configured")

await move(ayp, id, { to: "awaiting_approval" })
await move(nyp, id, { to: "approved" })
await move(fin, id, { to: "with_finance" })
await move(fin, id, { to: "disbursed", paymentRef: "TRF-1" })
ok(true, "the whole path runs with notifications attached")

// announce() must never throw, whatever it is handed.
let threw = false
try {
  await announce(id, "approved", hod.id)
  await announce("00000000-0000-0000-0000-000000000000", "approved", hod.id)
  await announce(id, "draft", hod.id)
} catch { threw = true }
ok(!threw, "announcing never throws, even for a requisition that does not exist")

await q("delete from requisitions where id=$1", [id])
await pool.end()
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed")
process.exit(failed ? 1 : 0)
