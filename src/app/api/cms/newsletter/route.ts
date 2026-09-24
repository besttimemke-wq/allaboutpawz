import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }
  const sub = await repo.addNewsletter(email)
  return NextResponse.json({ ok: true, id: sub.id }, { status: 201 })
}

export async function GET() {
  return NextResponse.json(await repo.listNewsletter())
}
