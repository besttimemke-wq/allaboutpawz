import { revalidatePath } from "next/cache"

// ---------------------------------------------------------------------------
// Centralized storefront revalidation.
//
// Every admin mutation (products / categories / brands / filters) eventually
// touches the storefront's category landing pages, PLPs, PDPs, or the home
// page's featured carousel. Calling revalidateShop() from inside the route
// handler — after the Supabase write succeeds — keeps the public site fresh
// without exposing the REVALIDATE_SECRET bearer token to the browser.
// ---------------------------------------------------------------------------

export function revalidateShop(): void {
  // Home page may surface featured products / category tiles.
  revalidatePath("/")
  // The shop index + canonical category PLP routes (`/shop/dog`,
  // `/shop/dog/grooming`, …) live under a single catch-all segment.
  revalidatePath("/shop")
  revalidatePath("/shop/[...slug]", "page")
  // The shopping bag reads cart-only state client-side but also renders
  // product recommendations; clear it too.
  revalidatePath("/shop/bag")
  // Product detail pages.
  revalidatePath("/products/[slug]", "page")
}
