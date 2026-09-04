"use client"

import { createClient } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { PawPrint } from "@phosphor-icons/react"

export function AdminUserMenu() {
  const router = useRouter()
  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <button
      onClick={signOut}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black hover:bg-zinc-200"
      title="Sign out"
    >
      <PawPrint size={14} weight="fill" />
    </button>
  )
}
