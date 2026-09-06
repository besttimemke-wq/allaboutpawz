import Link from "next/link"
import { Plus } from "lucide-react"

const policySlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export type PolicyLink = { id: string; title: string }

// FAQ page policy band — presentational. The policies arrive
// SERVER-RENDERED (from the database) as props.
export function PolicyBoxes({ policies }: { policies: PolicyLink[] }) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {policies.map((p) => (
        <Link
          key={p.id}
          href={`/policies/${policySlug(p.title)}`}
          className="group flex items-center justify-between gap-4 border border-gold/25 px-6 py-5 transition-colors hover:border-gold-deep hover:bg-gold/5"
        >
          <div>
            <p className="text-[10.5px] font-bold tracking-[0.18em] text-gold">{p.title}</p>
            <p className="mt-1.5 text-[11px] leading-[1.6] text-on-dark-muted">Read the policy</p>
          </div>
          <Plus className="h-4 w-4 shrink-0 text-gold transition-transform duration-300 group-hover:rotate-45" strokeWidth={1.8} />
        </Link>
      ))}
    </div>
  )
}
