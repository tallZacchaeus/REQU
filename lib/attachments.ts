import { createHash, randomBytes } from "node:crypto"
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises"
import { join } from "node:path"
import net from "node:net"

import { q } from "./db"

/**
 * Receipts, proposals and quotations — the documents a requisition stands or falls on.
 *
 * Three things matter here, in order: that what arrives is the kind of file it claims to
 * be, that it is never served back in a way a browser will execute, and that it is checked
 * for malware where that is available.
 */

export const MAX_BYTES = 10 * 1024 * 1024 // 10 MB — a photographed receipt, not a video
export const STORAGE_DIR = process.env.ATTACHMENT_DIR ?? "/data/attachments"

/**
 * Allowed types, recognised by what the bytes actually are rather than by the name or the
 * Content-Type the browser offers — both of which the sender chooses.
 */
const SIGNATURES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 4).toString("latin1") === "%PDF" },
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" },
  {
    type: "image/webp", ext: "webp",
    test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
  {
    type: "image/heic", ext: "heic",
    test: (b) => b.subarray(4, 8).toString("latin1") === "ftyp" &&
      ["heic", "heix", "mif1", "msf1"].includes(b.subarray(8, 12).toString("latin1")),
  },
]

export function sniff(bytes: Buffer) {
  return SIGNATURES.find((s) => s.test(bytes)) ?? null
}

export const ACCEPTED_DESCRIPTION = "PDF, JPEG, PNG, WebP or HEIC, up to 10 MB"

/** A name safe to put in a header and to show on screen. */
export function safeName(name: string, ext: string) {
  const base = name.replace(/[\r\n"\\]/g, "").replace(/[^\w .()-]/g, "_").slice(0, 80).trim()
  return base.toLowerCase().endsWith(`.${ext}`) ? base : `${base || "attachment"}.${ext}`
}

/* ── Virus scanning ──────────────────────────────────────────────────
   Off unless CLAMD_HOST is set. The mail server on this box runs ClamAV, but on its own
   Docker network alongside Postfix, Dovecot and the mail database; joining that network to
   borrow the scanner would give this application reach into all of it, which is a poor
   trade for scanning photographs of receipts. See docs/02-TRD.md. */

export const scanningEnabled = () => Boolean(process.env.CLAMD_HOST)

export type ScanVerdict = { ok: true; result: string } | { ok: false; result: string }

export function scan(bytes: Buffer): Promise<ScanVerdict> {
  const host = process.env.CLAMD_HOST
  const port = Number(process.env.CLAMD_PORT ?? 3310)
  if (!host) return Promise.resolve({ ok: true, result: "not scanned" })

  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const chunks: Buffer[] = []
    const done = (v: ScanVerdict) => { socket.destroy(); resolve(v) }
    // A scanner that hangs must not hold an upload open for ever.
    const timer = setTimeout(() => done({ ok: false, result: "scanner did not answer" }), 20_000)

    socket.on("connect", () => {
      socket.write("zINSTREAM\0")
      for (let i = 0; i < bytes.length; i += 64_000) {
        const slice = bytes.subarray(i, i + 64_000)
        const size = Buffer.alloc(4)
        size.writeUInt32BE(slice.length)
        socket.write(size)
        socket.write(slice)
      }
      socket.write(Buffer.from([0, 0, 0, 0]))
    })
    socket.on("data", (d) => chunks.push(d))
    socket.on("end", () => {
      clearTimeout(timer)
      const reply = Buffer.concat(chunks).toString("utf8").trim().replace(/\0+$/, "")
      if (reply.endsWith("OK")) return done({ ok: true, result: "clean" })
      if (reply.includes("FOUND")) return done({ ok: false, result: reply })
      done({ ok: false, result: reply || "scanner gave no answer" })
    })
    socket.on("error", (e) => {
      clearTimeout(timer)
      // Failing open would make the scanner decorative.
      done({ ok: false, result: `scanner unreachable: ${(e as Error).message}` })
    })
  })
}

/* ── Storing ─────────────────────────────────────────────────────── */

export interface Stored {
  id: string
  name: string
  kind: string
  bytes: number
  contentType: string
}

export async function store(opts: {
  requisitionId: string
  uploadedBy: number
  kind: "proposal" | "quotation" | "receipt" | "other"
  filename: string
  bytes: Buffer
}): Promise<Stored> {
  if (opts.bytes.length === 0) throw Object.assign(new Error("That file is empty."), { status: 400 })
  if (opts.bytes.length > MAX_BYTES) {
    throw Object.assign(new Error(`That file is larger than 10 MB. ${ACCEPTED_DESCRIPTION}.`), { status: 413 })
  }
  const kind = sniff(opts.bytes)
  if (!kind) {
    throw Object.assign(new Error(`That is not a file we accept. ${ACCEPTED_DESCRIPTION}.`), { status: 415 })
  }

  const verdict = await scan(opts.bytes)
  if (!verdict.ok) {
    throw Object.assign(new Error(`That file could not be accepted: ${verdict.result}.`), { status: 422 })
  }

  // The stored name is ours, never the sender's: a name is an instruction to a filesystem.
  const key = `${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}.${kind.ext}`
  const path = join(STORAGE_DIR, key)
  await mkdir(join(STORAGE_DIR, key.split("/")[0]!), { recursive: true })
  await writeFile(path, opts.bytes, { mode: 0o640 })

  const name = safeName(opts.filename, kind.ext)
  const rows = await q<{ id: string }>(
    `insert into attachments(requisition_id, name, kind, byte_size, content_type, storage_key,
                             uploaded_by, sha256, scanned_at, scan_result)
     values ($1,$2,$3,$4,$5,$6,$7,$8, now(), $9) returning id`,
    [opts.requisitionId, name, opts.kind, opts.bytes.length, kind.type, key, opts.uploadedBy,
     createHash("sha256").update(opts.bytes).digest("hex"), verdict.result],
  )
  return { id: rows[0]!.id, name, kind: opts.kind, bytes: opts.bytes.length, contentType: kind.type }
}

export async function load(id: string) {
  const rows = await q<{
    id: string; requisition_id: string; name: string; content_type: string
    storage_key: string | null; scanned_at: Date | null
  }>(
    `select id, requisition_id, name, content_type, storage_key, scanned_at
       from attachments where id=$1`, [id])
  const row = rows[0]
  if (!row?.storage_key || !row.scanned_at) return null
  try {
    return { ...row, bytes: await readFile(join(STORAGE_DIR, row.storage_key)) }
  } catch {
    return null
  }
}

export async function remove(id: string) {
  const rows = await q<{ storage_key: string | null }>("select storage_key from attachments where id=$1", [id])
  const key = rows[0]?.storage_key
  await q("delete from attachments where id=$1", [id])
  if (key) await unlink(join(STORAGE_DIR, key)).catch(() => undefined)
}
