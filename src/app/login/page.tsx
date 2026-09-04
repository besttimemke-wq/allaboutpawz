"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/auth/client"
import { LandingLoginView } from "@/components/dawg/LandingLoginView"
import type { AuthUser } from "@/lib/dawg-types"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (user: AuthUser, initialSection?: string) => {
    // When the LandingLoginView calls onLogin, we route based on role
    if (user.role === "customer") {
      router.push("/account")
    } else if (user.role === "groomer") {
      router.push("/admin?portal=groomer")
    } else {
      router.push("/admin")
    }
  }

  return <LandingLoginView onLogin={handleLogin} />
}
