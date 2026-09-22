"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { ScreenHeader } from "@/components/app/screen-header"
import { useToast } from "@/components/app/toast"
import { useSession } from "@/lib/session"

interface Person {
  id: number
  email: string
  fullName: string
  role: string
  department: string | null
  active: boolean
  registeredAt: string
  approvedBy: string | null
}

const ROLES = [
  { value: "pending", label: "Not yet assigned" },
  { value: "hod", label: "Head of Department" },
  { value: "ayp", label: "Assistant National Youth Pastor" },
  { value: "nyp", label: "National Youth Pastor" },
  { value: "finance", label: "Finance" },
  { value: "super_admin", label: "Administrator" },
]

/**
 * Who has registered, and what each of them is. People sign themselves in with their church
 * address and land here as "not yet assigned"; this is where somebody says what they do.
 */
export default function PeoplePage() {
  const router = useRouter()
  const toast = useToast()
  const { role, hydrated } = useSession()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(async () => {
    const r = await fetch("/api/people", { cache: "no-store" })
    if (r.ok) setPeople(((await r.json()) as { people: Person[] }).people)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (role !== "super_admin") router.replace("/")
    else void load()
  }, [hydrated, role, router, load])

  async function change(p: Person, patch: Partial<{ role: string; department: string; active: boolean }>) {
    setBusy(p.id)
    try {
      const r = await fetch(`/api/people/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? "That did not work.")
      toast(`${p.fullName} updated`)
      await load()
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn")
    } finally {
      setBusy(null)
    }
  }

  const waiting = people.filter((p) => p.role === "pending")
  const settled = people.filter((p) => p.role !== "pending")

  return (
    <>
      <ScreenHeader title="People" back="/" />
      <div className="flex-1 space-y-6 px-4 pt-4 pb-10 md:px-0">
        {loading && <p className="text-ink-faint text-[13px]">Loading…</p>}

        {!loading && waiting.length > 0 && (
          <section>
            <h2 className="text-ink mb-1 text-[14px] font-semibold">
              Waiting to be assigned ({waiting.length})
            </h2>
            <p className="text-ink-faint mb-3 text-[12px]">
              They have signed in with their church address. Until you give them a part, they
              can see nothing.
            </p>
            <div className="space-y-2">
              {waiting.map((p) => (
                <Row key={p.id} p={p} busy={busy === p.id} onChange={change} />
              ))}
            </div>
          </section>
        )}

        {!loading && (
          <section>
            <h2 className="text-ink mb-3 text-[14px] font-semibold">Everyone else ({settled.length})</h2>
            <div className="space-y-2">
              {settled.map((p) => (
                <Row key={p.id} p={p} busy={busy === p.id} onChange={change} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function Row({
  p, busy, onChange,
}: {
  p: Person
  busy: boolean
  onChange: (p: Person, patch: Partial<{ role: string; department: string; active: boolean }>) => void
}) {
  const [department, setDepartment] = useState(p.department ?? "")
  return (
    <div className="card-flat flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-[13.5px] font-semibold">{p.fullName}</p>
        <p className="text-ink-faint truncate text-[12px]">{p.email}</p>
      </div>

      <select
        value={p.role}
        disabled={busy}
        onChange={(e) => onChange(p, { role: e.target.value })}
        className="border-hairline bg-card text-ink rounded-lg border px-2.5 py-2 text-[12.5px]"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      <input
        value={department}
        disabled={busy}
        placeholder="Department"
        onChange={(e) => setDepartment(e.target.value)}
        onBlur={() => department !== (p.department ?? "") && onChange(p, { department })}
        className="border-hairline bg-card text-ink w-36 rounded-lg border px-2.5 py-2 text-[12.5px]"
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => onChange(p, { active: !p.active })}
        className="text-ink-faint hover:text-ink press rounded-lg px-2 py-2 text-[12px] font-medium"
      >
        {p.active ? "Switch off" : "Switch on"}
      </button>
    </div>
  )
}
