export type LegalDocument = {
  slug: string
  title: string
  description: string
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  { slug: "cancellations", title: "Cancellations", description: "Appointment cancellation and rescheduling terms." },
  { slug: "late-arrivals", title: "Late Arrivals", description: "Arrival timing and appointment rescheduling guidance." },
  { slug: "matted-coats", title: "Matted Coats", description: "Safety-first handling and de-matting policy." },
  { slug: "vaccinations", title: "Vaccinations", description: "Required vaccination records for salon visits." },
  { slug: "refunds-returns", title: "Refunds & Returns", description: "Return eligibility and refund information." },
  { slug: "shipping-delivery", title: "Shipping & Delivery", description: "Order fulfillment, shipping, and delivery information." },
  { slug: "privacy-policy", title: "Privacy Policy", description: "How All About Pawz collects, uses, and protects personal information." },
  { slug: "terms-of-service", title: "Terms of Service", description: "Terms governing use of All About Pawz services and website." },
  { slug: "terms-of-use", title: "Terms of Use", description: "Rules and conditions for using this website." },
  { slug: "accessibility", title: "Accessibility", description: "Accessibility commitment and assistance information." },
]

export function legalDocumentBySlug(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug)
}
