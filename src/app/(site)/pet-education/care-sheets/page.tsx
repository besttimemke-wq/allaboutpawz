import { permanentRedirect } from "next/navigation"

// Old /pet-education/care-sheets → /guides (closest page in the owner's
// Education Center design).
export default function PetEducationCareSheetsRedirect() {
  permanentRedirect("/guides")
}
