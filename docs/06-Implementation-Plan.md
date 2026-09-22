# 06 — Implementation Plan

**Leadership scope:** [REQU: from prototype to production](https://claude.ai/code/artifact/9eea7af6-6047-4273-b3e7-5c3d8238b31b)

## Status at a glance

| Phase | Work | Key files | Status |
| --- | --- | --- | --- |
| **0 — Prototype** | 29 screens across four role areas, the domain model, the workflow, reports with CSV and print | `app/`, `components/`, `lib/types.ts`, `lib/status.ts`, `lib/roles.ts` | **Done** (by the designer) |
| **Infra** | Containerised, behind Caddy at `requisition.rccgyayang.org`, loopback-only, deploy with rollback, in monitoring, holding password | `Dockerfile`, `docker-compose.yml`, `infra/deploy-from-git.sh` | **Done** |
| **1 — Database** | Schema, migration runner, seed; verified against PostgreSQL 16 | `db/migrations/001_core.sql`, `db/migrate.ts`, `db/seed.ts`, `lib/db.ts` | **Done** — *not yet wired to the screens* |
| **2 — Sign-in** | Single-use emailed links, self-registration for church addresses, sessions, rate limits | `db/migrations/002_auth.sql`, `lib/auth.ts`, `lib/mailer.ts`, `app/api/auth/*`, `app/api/me`, `db/verify-auth.mts` | **Done** — *screens still read the browser* |
| **3 — Permissions & transitions** | Every rule re-stated on the server; legal state moves only; screens read the database | `lib/authz.ts`, `lib/requisitions.ts`, `lib/api-actor.ts`, `app/api/requisitions/*`, `lib/authz.test.mts`, `db/verify-workflow.mts` | **Done.** Rules, endpoints and screens, all against the database |
| **4 — Attachments** | Real upload, ClamAV scanning, storage, reconciliation against receipts | — | **Pending** |
| **5 — Notifications & reports** | Email what is waiting on someone; server-side aggregation | — | **Pending** |
| **6 — Hardening** | Append-only audit trail in anger, backups, accessibility audit, pilot fixes | — | **Pending** |

Roughly **four to six weeks** of focused work from here, plus review time between phases.

## Order, and why

Each phase depends on the one before, which is why they are not parallel.

1. **Database first** because everything else writes to it.
2. **Sign-in next** because permissions are meaningless until the server knows who is asking.
3. **Permissions and transitions third** — the security core, and the point at which the
   screens stop reading the browser and start reading the database.

**Stop after phase 3 and reassess.** That is the first point at which something real exists —
actual accounts, shared data, rules that hold — and the workflow can be judged honestly by the
people who will use it before more is built on assumptions.

Attachments, notifications and reports are additive, and easier to build well once use has
confirmed the shape.

## Then pilot

One department. Real requisitions, small amounts, about a month, with the existing paper or
chat process still running alongside. Only after that should the parish rely on it for money
that matters.

## Known gaps and risks

1. **The prototype is still a prototype.** Anyone reaching the site can continue as any role,
   Finance included. A holding password now sits in front of it; that is containment, not a fix.
2. **Attachments are the largest hidden piece.** There is no file upload anywhere in the app,
   yet receipts are the entire basis of reconciliation.
3. **No auto-deploy.** GitHub Actions is refusing jobs on this account for billing reasons;
   deployment is `/opt/requ/deploy-from-git.sh`, run by hand. The mail app's workflow copies
   across once that is resolved.
4. **Departments are thin.** The seed knows only the two the prototype data mentions. The real
   list must come from the church before phase 2.
5. **Accessibility unaudited.** Focus states, contrast and a keyboard pass are all untested —
   see [04-UI-UX-Design-Brief.md](04-UI-UX-Design-Brief.md).
6. **Thin tests.** `npm run verify:auth` covers the sign-in machinery against a real database
   — replay, forged and tampered sessions, limits, expiry. Nothing else is covered; transitions
   and permissions need the same treatment in phase 3.
7. **Nobody has a part to play yet.** Anyone with an `@rccgyayang.org` address can now sign in
   and an account appears by itself, but it lands on *pending*: it sees nothing and does
   nothing until somebody says what they are.

   So the remaining step is not loading people — they load themselves. It is deciding **who is
   a Head of Department, who reviews, who approves, and who is Finance**, and setting that on
   **People** in the app. Until at least one Head of Department and one of each reviewer exist,
   no requisition can travel.

8. **Receipts still cannot be uploaded** (phase 4). A requisition can go the whole way and be
   marked reconciled with nothing attached. Worth closing before real money goes through.

## Decisions needed from leadership

These change what gets built, and are cheaper answered early. Set out in full in the scope
document; in short: who may sign in and who revokes it; whether large amounts need a second
approver; what follows from an overspend; whether a requisition may be withdrawn after
approval (**recommendation: cancel, never delete**); how long records are kept; and who holds
the Finance role.
