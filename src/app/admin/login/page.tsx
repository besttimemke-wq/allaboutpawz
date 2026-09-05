"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/auth/client"
import { PawPrint } from "@phosphor-icons/react"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/admin"
  const errorParam = searchParams.get("error")
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(errorParam === "not_admin" ? "You don't have admin access." : null)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <PawPrint size={40} weight="fill" className="mx-auto text-white" />
          <h1 className="mt-3 text-[18px] font-semibold tracking-[0.14em] text-white">ALL ABOUT PAWZ</h1>
          <p className="mt-1 text-[10px] font-bold tracking-[0.3em] text-zinc-500">ADMIN PORTAL</p>
        </div>

        <form onSubmit={signIn} className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-6">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="admin@aapawz.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white px-4 py-2.5 text-[13px] font-bold text-black hover:bg-zinc-200 disabled:opacity-40"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center text-[10px] text-zinc-600">
          Authorized personnel only. All actions are logged.
        </p>
      </div>
    </div>
  )
}
