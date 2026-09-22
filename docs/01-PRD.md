# 01 — Product Requirements Document (PRD)

**Project:** REQU — requisition management for RCCG YAYA
**Repository:** [`tallZacchaeus/REQU`](https://github.com/tallZacchaeus/REQU)
**Status:** prototype in review; production build begun (see [06-Implementation-Plan.md](06-Implementation-Plan.md))
**Scope document for leadership:** [REQU: from prototype to production](https://claude.ai/code/artifact/9eea7af6-6047-4273-b3e7-5c3d8238b31b)

## 1. Overview

A Head of Department needs money for a programme. Today that request travels by
conversation, message and paper: hard to find, harder to chase, and impossible to
reconstruct afterwards. REQU makes the journey a record — raised, recommended, approved,
paid, and closed when the receipts account for it.

The workflow, in one line:

```
HOD raises → ANYP recommends → NYP approves → Finance disburses → HOD reconciles
```

Finance pays, and later checks the receipts that close the requisition. A reviewer can
return a request to the HOD with specific changes at any point before payment.

## 2. Goals

1. **One shared record.** Everyone involved sees the same requisition at the same stage.
2. **Nothing lost.** A request that has been raised cannot quietly disappear or stall unseen.
3. **Accountable money.** Every approval and payment is attributable to a person and a moment.
4. **Closed properly.** A requisition ends when the receipts account for the spend, not when
   the money leaves.
5. **Usable without training.** Church officers are volunteers with other jobs; the app has to
   be obvious on a phone at short notice.

## 3. Users

| Role | Does | Sees |
| --- | --- | --- |
| **Head of Department** (`hod`) | Raises requisitions, tracks them, files reconciliations | Their own department only |
| **Assistant National Youth Pastor** (`ayp`) | Recommends, or returns with changes | Everything submitted; never drafts |
| **National Youth Pastor** (`nyp`) | Approves, returns or rejects | Everything recommended to them |
| **Finance Officer** (`finance`) | Disburses funds, closes reconciliations | What has been approved |

Roughly 70–90 officers across the EXCO list, most phone-first, most using this occasionally
rather than daily.

## 4. Core requirements

**Built in the prototype** — screens exist and work against browser storage:

- Raise a requisition: programme, date, location, purpose, and itemised expenses.
- Attach proposals and quotations *(names only; no real upload — see below)*.
- Review queues per role, ordered by longest waiting.
- Recommend, approve, return with specific changes, reject.
- Record a disbursement with a payment reference.
- Reconcile: actual spend per line against budget, with variance.
- Comments and an activity trail on every requisition.
- Reports with CSV export and print.

**Required for production, not yet built** — see [06-Implementation-Plan.md](06-Implementation-Plan.md):

- ~~Real sign-in~~ **done** — single-use emailed links, and people register themselves.
- Permissions enforced by the server rather than drawn by the browser.
- Real file upload for receipts, with scanning.
- Notifications by email.
- An append-only audit trail.

## 5. User stories

- As a **HOD**, I raise a requisition for a programme and watch it move, so I do not have to
  ask anyone where it has got to.
- As a **HOD**, I am told exactly what to change when something is returned, rather than
  "fix it".
- As an **ANYP**, I see what is waiting on me, oldest first, so nothing sits unnoticed.
- As the **NYP**, I approve knowing a colleague has already recommended it.
- As **Finance**, I pay only what has been approved, and record the transfer reference against it.
- As **Finance**, I can see which disbursements have not yet been accounted for.
- As a **HOD**, I close a requisition by entering what each line actually cost and attaching
  the receipts.

## 6. Success metrics

| Measure | Why it matters |
| --- | --- |
| Requisitions raised in the app rather than by message | Adoption; the whole point |
| Median time from raised to approved | The delay people actually complain about |
| Proportion disbursed and then reconciled within 30 days | Whether money is being accounted for |
| Requisitions returned for changes | High means the form is asking the wrong things |
| Officers who sign in unaided the first time | The usability bar we set ourselves |

## 7. Out of scope (for now)

Budgets and allocations, purchase orders, supplier management, payroll, accounting-system
integration, and multi-currency. REQU records that money was requested, approved, paid and
accounted for — it is not an accounting system.
