# REQU

Requisition management for a church Youth & Young Adults department. A Head of
Department raises a funding request; it travels through recommendation,
approval and payment, and closes when the receipts are accounted for.

**Live:** https://requ-rubyddesigner.vercel.app
**Testing notes:** [TESTING.md](TESTING.md)

## The workflow

```
HOD raises  →  ANYP recommends  →  NYP approves  →  Finance disburses  →  HOD reconciles
```

Finance pays and later checks the receipts that close the requisition. A
reviewer can send a request back to the HOD with specific changes at any point
before payment.

## Roles

| Role | Does |
| --- | --- |
| Head of Department | Raises requisitions, tracks them, files reconciliations |
| Assistant National Youth Pastor | Recommends or returns |
| National Youth Pastor | Approves, returns or rejects |
| Finance | Disburses funds and closes reconciliations |

Each role sees only its own slice of the app. An HOD cannot open another
department's requisition; a reviewer never sees a draft.

## The database

Phase 1 of making this real. The schema lives in `db/migrations`, and follows `lib/types.ts`
closely — the model the prototype was built around was a good one, and 29 screens are already
written against it.

```bash
export DATABASE_URL=postgres://user:pass@host:5432/requ
npm run db:migrate            # apply anything not yet applied; safe to re-run
npm run db:seed               # departments and the four accounts
npm run db:seed -- --samples  # plus the 14 sample requisitions (refuses under NODE_ENV=production)
```

Two things worth knowing before building on it:

- **Money is whole naira in a bigint.** Minor units are the usual habit, but nothing in this
  workflow deals in kobo, and a units mismatch across those screens is a likelier bug than the
  precision is a need.
- **`activity` is append-only.** No update or delete path should ever be written against it.
  When a process ends in a payment, the record of who did what has to be the one thing nobody
  can quietly tidy afterwards.

**The screens do not read from this yet** — they still use the browser's own storage. Wiring
them up, along with real sign-in and permissions enforced on the server, is phases 2 and 3.

## Running it

Requires Node 20.9+. There are no environment variables and no services to
stand up — clone and run.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The sign-in screen lists prototype accounts —
tap one rather than typing an address.

## How it is built

Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript.

There is no backend. All state lives in the browser's `localStorage`, seeded
from `lib/data.ts`. That keeps the prototype self-contained, and it means two
people cannot collaborate on one requisition — see TESTING.md.

```
app/                 routes, one folder per role
components/app/      shared UI and the design system's parts
components/reviewer/ the review desks, rendered from lib/roles.ts
lib/                 domain types, workflow, formatting, derived reports
```

The three reviewing desks are one set of screens driven by config, not three
copies. `lib/roles.ts` describes what each desk sees and which actions it may
take.

## Deploying

`main` is wired to Vercel: pushing to it rebuilds the site.

One caveat on the current Vercel plan — **only the account owner's commits
trigger a build.** A push authored by anyone else is rejected with "the commit
author doesn't have permission to create deployments for this project." Until
the project moves to a Vercel team, other contributors should open pull
requests and let the owner merge, which re-authors the merge commit.

## Not production ready

- No authentication. The magic link is simulated and anyone can pick a role.
- No file storage. Attachments record a name and size only.
- All figures are invented.
