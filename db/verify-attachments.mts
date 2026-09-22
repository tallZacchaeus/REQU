/**
 * What the file handling must refuse. Run against a scratch database with ATTACHMENT_DIR
 * pointed somewhere disposable.
 */
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

process.env.ATTACHMENT_DIR = await mkdtemp(join(tmpdir(), "requ-attach-"))

const { sniff, safeName, store, load, MAX_BYTES } = await import("../lib/attachments")
const { pool, q } = await import("../lib/db")

let failed = 0
const ok = (pass: boolean, what: string) => { if (!pass) failed++; console.log(`  ${pass ? "PASS" : "FAIL"}  ${what}`) }
const refused = async (fn: () => Promise<unknown>, what: string) => {
  try { await fn(); ok(false, what + " (it was ALLOWED)") } catch { ok(true, what) }
}

const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(64, 0x20)])
const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(64)])
const HTML = Buffer.from("<html><script>alert(1)</script></html>")
const EXE = Buffer.from("MZ\x90\x00" + "\x00".repeat(64))

/* ── What a file actually is ─────────────────────────────── */
ok(sniff(PDF)?.type === "application/pdf", "a PDF is recognised")
ok(sniff(PNG)?.type === "image/png", "a PNG is recognised")
ok(sniff(HTML) === null, "HTML is not accepted, whatever it is called")
ok(sniff(EXE) === null, "a Windows executable is not accepted")
ok(sniff(Buffer.from("%PDF")) !== null, "the check reads the bytes, not the extension")

/* ── Names ───────────────────────────────────────────────── */
ok(!safeName('../../etc/passwd', "pdf").includes("/"), "a path cannot travel in a filename")
ok(!safeName('a"; rm -rf /', "pdf").includes('"'), "a quote cannot escape the header")
ok(safeName("receipt", "pdf") === "receipt.pdf", "the real extension is appended")
ok(safeName("", "png") === "attachment.png", "an empty name still produces one")

/* ── Storing ─────────────────────────────────────────────── */
const dept = await q<{ id: number }>("insert into departments(name) values ('Attach Check') on conflict (name) do update set name=excluded.name returning id")
const person = await q<{ id: number }>(
  `insert into people(email, full_name, initials, role, department_id, active)
   values ('check.attach@example.invalid','Check Attach','CA','hod',$1,true)
   on conflict (email) do update set active=true returning id`, [dept[0]!.id])
const req = await q<{ id: string }>(
  `insert into requisitions(reference, programme, department_id, requester_id, status)
   values ('REQ-CHECK-${Date.now()}','Attachment check',$1,$2,'draft') returning id`,
  [dept[0]!.id, person[0]!.id])

const base = { requisitionId: req[0]!.id, uploadedBy: person[0]!.id, kind: "receipt" as const }
const saved = await store({ ...base, filename: "receipt.pdf", bytes: PDF })
ok(!!saved.id, "a PDF is stored")
ok((await load(saved.id))?.bytes.equals(PDF) === true, "and comes back byte for byte")

await refused(() => store({ ...base, filename: "x.pdf", bytes: HTML }), "HTML renamed .pdf is refused")
await refused(() => store({ ...base, filename: "x.png", bytes: EXE }), "an executable renamed .png is refused")
await refused(() => store({ ...base, filename: "empty.pdf", bytes: Buffer.alloc(0) }), "an empty file is refused")
await refused(() => store({ ...base, filename: "big.pdf", bytes: Buffer.concat([PDF, Buffer.alloc(MAX_BYTES)]) }),
  "anything over 10 MB is refused")

const stored = await q<{ storage_key: string; name: string }>(
  "select storage_key, name from attachments where id=$1", [saved.id])
ok(!stored[0]!.storage_key.includes(".."), "the stored path contains no traversal")
ok(/^[0-9]{4}-[0-9]{2}\/[0-9a-f]{32}\.pdf$/.test(stored[0]!.storage_key),
   "the file on disk is named by us, not by the sender")

await q("delete from requisitions where id=$1", [req[0]!.id])
await pool.end()
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed")
process.exit(failed ? 1 : 0)
