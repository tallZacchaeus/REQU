/**
 * Exhaustive rather than illustrative: every role is tried against every state and every
 * target status, and the count of permitted moves is asserted. A rule accidentally widened
 * later shows up as a number that no longer matches, which a few hand-picked cases would
 * quietly miss.
 *
 *   npx tsx lib/authz.test.mts
 */
import { canSee, canEdit, canTransition, allowedTransitions, TRANSITIONS, type Actor, type Subject } from "./authz"
import type { RequisitionStatus } from "./types"
import type { Role } from "./data"

let failed = 0
const ok = (pass: boolean, what: string) => { if (!pass) failed++; console.log(`  ${pass ? "PASS" : "FAIL"}  ${what}`) }

const ALL: RequisitionStatus[] = ["draft","under_review","recommended","awaiting_approval","approved",
  "with_finance","disbursed","changes_requested","rejected","reconciliation_review","reconciled"]
const ROLES: Role[] = ["pending","hod","ayp","nyp","finance","super_admin"]

const owner: Actor   = { id: 1, role: "hod", departmentId: 10 }
const colleague: Actor = { id: 2, role: "hod", departmentId: 10 }   // same department
const stranger: Actor  = { id: 3, role: "hod", departmentId: 99 }   // another department
const ayp: Actor = { id: 4, role: "ayp", departmentId: null }
const nyp: Actor = { id: 5, role: "nyp", departmentId: null }
const fin: Actor = { id: 6, role: "finance", departmentId: null }
const subj = (status: RequisitionStatus): Subject => ({ requesterId: 1, departmentId: 10, status })

/* ── Visibility ─────────────────────────────────────────────── */
ok(ALL.every((s) => canSee(owner, subj(s))), "the owner sees their requisition in every state")
ok(ALL.every((s) => canSee(colleague, subj(s))), "a colleague in the same department sees it")
ok(ALL.every((s) => !canSee(stranger, subj(s))), "a HOD in another department sees none of it")
for (const r of [ayp, nyp, fin]) {
  ok(!canSee(r, subj("draft")), `${r.role} cannot see a draft`)
  ok(ALL.filter((s) => s !== "draft").every((s) => canSee(r, subj(s))), `${r.role} sees everything submitted`)
}

/* ── Editing ────────────────────────────────────────────────── */
ok(canEdit(owner, subj("draft")) && canEdit(owner, subj("changes_requested")), "the owner edits a draft or a returned one")
ok(ALL.filter((s) => s !== "draft" && s !== "changes_requested").every((s) => !canEdit(owner, subj(s))),
   "the owner cannot edit once it has moved on")
ok(!canEdit(colleague, subj("draft")), "a colleague cannot edit someone else's figures")
ok([ayp, nyp, fin].every((r) => ALL.every((s) => !canEdit(r, subj(s)))), "no reviewer can ever edit the figures")

/* ── Transitions: the whole matrix ──────────────────────────── */
let permitted = 0
for (const role of ROLES) {
  const actor: Actor = { id: 1, role, departmentId: 10 }
  for (const from of ALL) for (const to of ALL) {
    if (canTransition(actor, subj(from), to).ok) permitted++
  }
}
ok(permitted === TRANSITIONS.length,
   `exactly the ${TRANSITIONS.length} moves in the table are permitted (found ${permitted})`)

/* ── The ones that would matter most if wrong ───────────────── */
ok(!canTransition(owner, subj("awaiting_approval"), "approved").ok, "a HOD cannot approve their own requisition")
ok(!canTransition(colleague, subj("draft"), "under_review").ok, "a colleague cannot submit someone else's draft")
ok(!canTransition(ayp, subj("awaiting_approval"), "approved").ok, "the ANYP cannot give final approval")
ok(!canTransition(ayp, subj("with_finance"), "disbursed").ok, "the ANYP cannot disburse")
ok(!canTransition(nyp, subj("with_finance"), "disbursed").ok, "the NYP cannot disburse")
ok(!canTransition(fin, subj("under_review"), "awaiting_approval").ok, "Finance cannot recommend")
ok(!canTransition(fin, subj("awaiting_approval"), "approved").ok, "Finance cannot approve")
ok(!canTransition(owner, subj("disbursed"), "reconciled").ok, "the owner cannot sign off their own reconciliation")
ok(!canTransition(stranger, subj("draft"), "under_review").ok, "someone who cannot see it cannot move it")
ok(!canTransition(owner, subj("rejected"), "under_review").ok, "a rejected requisition cannot be quietly revived")
ok(!canTransition(owner, subj("reconciled"), "under_review").ok, "a closed requisition cannot be reopened")
ok(!canTransition(fin, subj("approved"), "disbursed").ok, "Finance cannot skip its own processing step")

/* ── The platform administrator ─────────────────────────────── */
const admin: Actor = { id: 7, role: "super_admin", departmentId: null }
ok(ALL.every((s) => canSee(admin, subj(s))), "the administrator sees everything, drafts included")
ok(ALL.every((s) => !canEdit(admin, subj(s))), "the administrator can never edit the figures")
ok(ALL.every((from) => ALL.every((to) => !canTransition(admin, subj(from), to).ok)),
   "the administrator cannot make a single move in the workflow")
ok(allowedTransitions(admin, subj("awaiting_approval")).length === 0, "nothing is offered to them to approve")

/* ── Someone who has registered but has no part yet ─────────── */
const newcomer: Actor = { id: 8, role: "pending", departmentId: 10 }
ok(ALL.every((s) => !canSee(newcomer, subj(s))), "a pending account sees nothing at all")
ok(ALL.every((s) => !canEdit(newcomer, subj(s))), "a pending account can edit nothing")
ok(ALL.every((from) => ALL.every((to) => !canTransition(newcomer, subj(from), to).ok)),
   "a pending account can make no move whatsoever")

/* ── The happy path, in order ───────────────────────────────── */
ok(canTransition(owner, subj("draft"), "under_review").ok, "HOD submits")
ok(canTransition(ayp, subj("under_review"), "awaiting_approval").ok, "ANYP recommends")
ok(canTransition(nyp, subj("awaiting_approval"), "approved").ok, "NYP approves")
ok(canTransition(fin, subj("approved"), "with_finance").ok, "Finance takes it up")
ok(canTransition(fin, subj("with_finance"), "disbursed").ok, "Finance disburses")
ok(canTransition(owner, subj("disbursed"), "reconciliation_review").ok, "HOD files the reconciliation")
ok(canTransition(fin, subj("reconciliation_review"), "reconciled").ok, "Finance closes it")

ok(allowedTransitions(ayp, subj("under_review")).sort().join(",") === "awaiting_approval,changes_requested",
   "the ANYP is offered exactly recommend and return")
ok(allowedTransitions(owner, subj("under_review")).length === 0, "the owner is offered nothing while it is under review")

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed")
process.exit(failed ? 1 : 0)
