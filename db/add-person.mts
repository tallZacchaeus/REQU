/**
 * Adds or updates one real person. This replaced a seed script that invented four accounts
 * on a domain the church does not own — convenient for a prototype, and precisely the sort
 * of thing that should never be one command away from a live database.
 *
 *   npm run person -- --email pastor.x@rccgyayang.org --name "Pastor X" --role hod --department "Media"
 *
 * Roles: hod, ayp, nyp, finance, super_admin.
 * The department is created if it does not exist yet. Run it again to change somebody's
 * role or department; it updates rather than duplicating.
 */
import { pool, q } from "../lib/db"

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

const ROLES = ["hod", "ayp", "nyp", "finance", "super_admin"]

const email = arg("email")?.trim().toLowerCase()
const name = arg("name")?.trim()
const role = arg("role")?.trim()
const department = arg("department")?.trim()
const title = arg("title")?.trim()

const die = (m: string) => { console.error(`\n  ${m}\n`); process.exit(1) }

if (!email || !name || !role) die("Need at least --email, --name and --role.")
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email!)) die(`"${email}" is not an email address.`)
if (!ROLES.includes(role!)) die(`Role must be one of: ${ROLES.join(", ")}`)

const initials = name!.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()

let departmentId: number | null = null
if (department) {
  const d = await q<{ id: number }>(
    "insert into departments(name) values ($1) on conflict (name) do update set name=excluded.name returning id",
    [department])
  departmentId = d[0]!.id
}

const existing = await q<{ id: number }>("select id from people where lower(email)=lower($1)", [email])

await q(
  `insert into people(email, full_name, short_name, initials, role, title, department_id, active)
   values ($1,$2,$3,$4,$5,$6,$7,true)
   on conflict (email) do update set
     full_name=excluded.full_name, short_name=excluded.short_name, initials=excluded.initials,
     role=excluded.role, title=excluded.title, department_id=excluded.department_id, active=true`,
  [email, name, name!.split(/\s+/)[0], initials, role, title ?? null, departmentId])

console.log(`\n  ${existing.length ? "Updated" : "Added"} ${name} <${email}> as ${role}${department ? ` in ${department}` : ""}.`)
console.log("  They sign in at https://requisition.rccgyayang.org with a link sent to that address.\n")
await pool.end()
