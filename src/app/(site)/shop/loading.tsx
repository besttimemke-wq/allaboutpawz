import { Skeleton } from "@/components/ui/skeleton"

// Shown instantly on every /shop navigation while the server resolves the
// taxonomy and product query. The site chrome (header/footer) stays mounted.
export default function ShopLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6" aria-busy="true">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-6 h-[220px] w-full rounded-none" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-none" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-5 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
