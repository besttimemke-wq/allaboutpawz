import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(req: NextRequest) {
  try {
    const authToken = req.headers.get("authorization")
    const expectedToken = `Bearer ${process.env.REVALIDATE_SECRET}`

    if (!authToken || authToken !== expectedToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    revalidatePath("/shop")
    revalidatePath("/shop/bag")
    revalidatePath("/products/[slug]", "page")

    return NextResponse.json({ revalidated: true, paths: ["/shop", "/products/*"], now: Date.now() })
  } catch {
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 })
  }
}
