import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"

// /api/shop/reviews — public product reviews.
//
//   GET  ?productId=<uuid>   → visible reviews for the product, newest first.
//   POST { productId, author, rating, title?, body }
//        → creates a review with visible:false (pending moderation) → 201 + row.
//
// Validation: author ≥ 2 chars, rating integer 1–5, body ≥ 10 chars,
// productId must exist AND belong to a visible product.

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "")

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId")
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 })
  }
  try {
    const rows = await repo.list("product_reviews")
    const reviews = rows
      .filter((r: any) => r.productId === productId && r.visible)
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )
    return NextResponse.json({ reviews })
  } catch (e: any) {
    console.error("[shop/reviews GET]", e)
    return NextResponse.json({ error: e.message || "Could not load reviews" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const productId = asString(payload.productId)
  const author = asString(payload.author)
  const body = asString(payload.body)
  const title = asString(payload.title)
  const rating = Number(payload.rating)

  if (author.length < 2) {
    return NextResponse.json({ error: "Please add your name (at least 2 characters)." }, { status: 400 })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 })
  }
  if (body.length < 10) {
    return NextResponse.json({ error: "Please write a few words (at least 10 characters)." }, { status: 400 })
  }
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 })
  }

  try {
    // Product must exist and be publicly visible.
    const product = await repo.get("products", productId)
    if (!product || product.visible === false) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const review = await repo.create("product_reviews", {
      productId,
      author,
      rating,
      title: title || null,
      body,
      verified: false, // becomes "Verified buyer" only after salon moderation
      visible: false,  // pending moderation — hidden from the public list
    })
    return NextResponse.json({ review }, { status: 201 })
  } catch (e: any) {
    console.error("[shop/reviews POST]", e)
    return NextResponse.json({ error: e.message || "Could not save review" }, { status: 500 })
  }
}
