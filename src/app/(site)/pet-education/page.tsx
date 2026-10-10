import { permanentRedirect } from "next/navigation"

// Old Education Center URL (/pet-education) → the owner's Education Center
// hub at /guides. The owner's seopages design replaced the pages that used
// to live here; his sitemap declares /guides as the library entry point.
// This file only exists so the legacy URL keeps resolving (308).
export default function PetEducationRedirect() {
  permanentRedirect("/guides")
}
