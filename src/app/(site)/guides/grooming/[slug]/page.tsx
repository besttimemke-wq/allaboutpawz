import { permanentRedirect } from "next/navigation"

type Params = { params: Promise<{ slug: string }> }

export default async function LegacyGroomingGuidePage({ params }: Params) {
  const { slug } = await params
  permanentRedirect(`/pawzsly-u/memphis/${slug}`)
}
