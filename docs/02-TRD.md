# 02 — Technical Requirements Document (TRD)

**Related:** [01-PRD.md](01-PRD.md) · [05-Backend-Schema.md](05-Backend-Schema.md) · [06-Implementation-Plan.md](06-Implementation-Plan.md)

## 1. Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack) | React 19 |
| Language | **TypeScript** (strict) | |
| Styling | **Tailwind CSS 4** + shadcn-style primitives | tokens in `app/globals.css` |
| Icons | `lucide-react` | |
| Fonts | Source Sans 3 (text), IBM Plex Mono (figures) | `next/font/google`, self-hosted at build |
| Database | **PostgreSQL 16** | shared instance on the VPS |
| DB access | `pg` with hand-written SQL | same idiom as the mail app; no ORM |
| Sessions | **Redis** *(planned, phase 2)* | the instance the mail app already runs |

**No ORM is deliberate.** The mail application on the same box uses raw SQL and a small
migration runner. One idiom across both projects means one set of habits to debug at 11pm.

## 2. Hosting

- **Hostinger VPS** `147.93.53.236`, shared with the RCCG YAYANG mail server.
- **Caddy** owns 80/443 for every hostname on the box and terminates TLS for
  `requisition.rccgyayang.org`; certificates issue and renew automatically.
- REQU runs as a Docker container (`requ-web-1`) bound to **127.0.0.1:3200 only** — never
  exposed directly to the internet.
- Source at `/opt/requ/src` (a clone of the public repo); deploy with
  `/opt/requ/deploy-from-git.sh`, which pulls, rebuilds, health-checks and **rolls back to the
  previous commit if the new one does not answer**.
- **A holding password** (HTTP basic auth at the Caddy level, user `reviewer`) sits in front of
  the whole site while it is a prototype. It comes off when real sign-in exists.

## 3. Integrations

| Integration | Status | Purpose |
| --- | --- | --- |
| RCCG YAYANG mail server (SMTP) | *planned, phase 2* | Sign-in links and notifications |
| ClamAV (already on the box) | *planned, phase 4* | Scanning uploaded receipts |
| Nightly backup job | *planned, phase 6* | Extending the mail server's existing job |
| Self-monitoring | **live** | `requ-web-1` and an HTTP check every 15 minutes |

## 4. Constraints

- **Shared machine.** The mail server is the priority tenant; REQU must not compete for
  memory or disk. Current headroom: 12% disk, 43% memory used.
- **No GitHub Actions.** Actions is refusing jobs on this account for billing reasons, so
  deployment is the script above, run by hand. The mail app's workflow copies across when
  that is resolved.
- **Naira, whole units.** No kobo anywhere in the domain; see [05-Backend-Schema.md](05-Backend-Schema.md).
- **Phone-first.** Most officers will use this on a phone, occasionally, without training.

## 5. Non-functional requirements

**Security.** Every permission enforced on the server. No trust in anything the browser
asserts. Sign-in by single-use expiring link; no passwords stored. The audit trail is
append-only. Uploaded files scanned before they are retrievable.

**Reliability.** A failed deploy rolls back by itself. Nightly backups with a restore that has
actually been tested — the mail server's backup job proves its restore by loading a dump into
a scratch database and comparing row counts, and REQU should be held to the same standard.

**Performance.** Modest: tens of users, hundreds of requisitions a year. Correctness and
clarity matter far more than throughput.

**Accessibility.** See [04-UI-UX-Design-Brief.md](04-UI-UX-Design-Brief.md).

## 6. Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | *planned, phase 2* — sessions and rate limits |
| `SMTP_*` / `MASTER_USER` / `MASTER_PASSWORD` | *planned, phase 2* — sending through the mail server |

Local development reads `.env.local` (gitignored). There are currently no secrets in the
repository, and the public repo must stay that way.
