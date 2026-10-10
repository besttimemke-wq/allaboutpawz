import { permanentRedirect } from "next/navigation"

// Old /pet-education/articles → /guides (the owner's full guide directory).
export default function PetEducationArticlesRedirect() {
  permanentRedirect("/guides")
}
