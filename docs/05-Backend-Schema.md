# 05 — Backend Schema & API Surface

**Source of truth:** [`db/migrations/`](../db/migrations) (applied by [`db/migrate.ts`](../db/migrate.ts)),
with the domain types in [`lib/types.ts`](../lib/types.ts).

The schema exists and is verified against PostgreSQL 16. **It is not yet wired to the
screens** — they still read the browser's own storage. See [06-Implementation-Plan.md](06-Implementation-Plan.md).

## 1. Conventions

- **Money is whole naira in a `bigint`.** Minor units are the usual habit, but nothing in this
  workflow deals in kobo, and a units mismatch across 29 screens is a likelier bug than the
  precision is a need.
- **Statuses and roles are `text` with a `check` constraint**, not enum types, so adding one is
  a one-line migration rather than a type rewrite.
- **`activity` is append-only by construction.** No update or delete path is written against
  it. When a process ends in a payment, the record of who did what must be the one thing
  nobody can quietly tidy afterwards.
- Requisition ids are UUIDs; people and departments use serial integers.

## 2. Tables

```mermaid
erDiagram
    departments ||--o{ people : "belong to"
    departments ||--o{ requisitions : "raised in"
    people ||--o{ requisitions : raises
    requisitions ||--o{ expense_items : "budgets"
    requisitions ||--o{ attachments : has
    requisitions ||--o{ comments : has
    requisitions ||--o{ activity : records
    requisitions ||--o{ requisition_stages : "completes"
    requisitions ||--o| reconciliations : "closed by"
    expense_items ||--o| reconciliation_actuals : "actually cost"
```

| Table | Holds |
| --- | --- |
| `departments` | `id`, `name` (unique), `sort_order` |
| `people` | `id`, `email` (unique), `full_name`, `short_name`, `initials`, `role`, `title`, `scope`, `phone`, `department_id`, `active`, `created_at` |
| `requisitions` | `id` (uuid), `reference` (unique), `programme`, `programme_date`, `location`, `purpose`, `department_id`, `requester_id`, `status`, `payment_ref`, `submitted_at`, `created_at`, `updated_at` |
| `expense_items` | `id`, `requisition_id`, `description`, `amount` (naira), `sort_order` |
| `attachments` | `id`, `requisition_id`, `name`, `kind`, `byte_size`, `content_type`, `storage_key`, `uploaded_by`, `created_at` |
| `comments` | `id`, `requisition_id`, `author_id`, `body`, `requested_changes` (text[]), `created_at` |
| `activity` | `id`, `requisition_id`, `actor_id`, `action`, `detail` (jsonb), `at` — **append-only** |
| `requisition_stages` | `(requisition_id, stage)`, `completed_at`, `note` — a row exists only once the stage is done |
| `reconciliations` | `requisition_id` (pk), `note`, `submitted_at` |
| `reconciliation_actuals` | `(requisition_id, expense_item_id)`, `amount` (naira) |
| `login_tokens` | `token_hash` (pk), `person_id`, `expires_at`, `used_at`, `requested_ip` — only the hash is stored, and the row is kept after use so a replay can be told from a link that never existed |
| `sessions` | `id` (pk), `person_id`, `created_at`, `last_seen_at`, `expires_at`, `user_agent`, `ip` |
| `rate_limits` | `(key, window_start)`, `count` |

**Roles:** `hod`, `ayp`, `nyp`, `finance`.
**Statuses:** `draft`, `under_review`, `recommended`, `awaiting_approval`, `approved`,
`with_finance`, `disbursed`, `changes_requested`, `rejected`, `reconciliation_review`,
`reconciled`.
**Stages:** `submitted`, `recommended`, `approval`, `disbursement`, `reconciled`.

`attachments.storage_key` is null until phase 4 puts real uploads behind it.

## 3. Running it

```bash
export DATABASE_URL=postgres://user:pass@host:5432/requ
npm run db:migrate            # apply what is outstanding; safe to re-run
npm run db:seed               # departments and the four accounts
npm run db:seed -- --samples  # plus 14 sample requisitions; refuses under NODE_ENV=production
```

The seed reads [`lib/data.ts`](../lib/data.ts) rather than restating it, so the prototype and
the database cannot drift apart while both exist.

## 4. API surface

The four authentication endpoints are **built and checked** (`npm run verify:auth`). Everything
below them is still planned — a documented endpoint that does not exist is worse than none,
so the phase column says which is which.

| Method & path | Purpose | Phase |
| --- | --- | --- |
| `POST /api/auth/request-link` | Email a single-use sign-in link | **built** |
| `GET /api/auth/verify` | Exchange the link for a session | **built** |
| `POST /api/auth/signout` | End the session | **built** |
| `GET /api/me` | Who is signed in, and their role | **built** |
| `GET /api/requisitions` | List, scoped to the caller's role | **built** |
| `POST /api/requisitions` | Create a draft | **built** |
| `GET /api/requisitions/:id` | Detail, if the caller may see it | **built** |
| `PATCH /api/requisitions/:id` | Edit while draft or returned, and make a move | **built** |
| `POST /api/requisitions/:id/reconcile` | Actual spend and receipts | 4 |
| `POST /api/requisitions/:id/attachments` | Upload, scan, store | 4 |
| `GET /api/reports` | Server-side aggregation | 5 |

Moves are made through `PATCH` with a `to` status rather than one endpoint per verb: the
screens save a requisition as a whole, and a single guarded entry point is easier to be sure
about than nine.

**The rules live in [`lib/authz.ts`](../lib/authz.ts)** — one table of every legal move, with
the role permitted to make it. Anything absent is refused. `lib/review.ts` and `lib/roles.ts`
still run in the browser, but they now decide only what is *drawn*; nothing depends on them
for safety.
