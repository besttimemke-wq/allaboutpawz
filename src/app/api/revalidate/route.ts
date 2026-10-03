import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

// POST /api/revalidate — Supabase webhook target.
//
// When an admin pushes a change to Supabase (services, settings,
// testimonials, products, etc.), Supabase fires a webhook to this
// route. This route revalidates the affected pages so the next visitor
// sees the updated content.
//
// Security: the request must include the REVALIDATE_SECRET token.
// Configure REVALIDATE_SECRET in .env and set the same value in your
// Supabase webhook configuration.

export async function POST(req: NextRequest) {
  try {
    const authToken = req.headers.get("authorization")
    const expectedToken = `Bearer ${process.env.REVALIDATE_SECRET}`

    if (!authToken || authToken !== expectedToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Revalidate the pages that use CMS data. If the body includes a
    // specific path, revalidate that. Otherwise revalidate all public pages.
    const pathsToRevalidate: string[] = body?.paths || [
      "/",
      "/services",
      "/pricing",
      "/shop",
      "/gallery",
      "/about",
      "/faq",
      "/contact",
    ]

    for (const path of pathsToRevalidate) {
      revalidatePath(path)
    }

    return NextResponse.json({
      revalidated: true,
      paths: pathsToRevalidate,
      now: Date.now(),
    })
  } catch {
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 })
  }
}
