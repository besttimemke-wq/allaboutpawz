import { permanentRedirect } from "next/navigation"

type Params = { params: Promise<{ slug: string[] }> }

export default async function LegacyGuidePage({ params }: Params) {
  const { slug } = await params
  const destination = slug.at(-1)
  permanentRedirect(destination ? `/pawsly-u/memphis/${destination}` : "/pawsly-u/memphis")
}
