export type LegalDocument = {
  slug: string
  title: string
  description: string
  group: "Appointments & salon" | "Shopping & orders" | "Privacy & website"
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  { slug: "cancellations", title: "Cancellations", description: "Appointment cancellation and rescheduling terms.", group: "Appointments & salon" },
  { slug: "late-arrivals", title: "Late Arrivals", description: "Arrival timing and appointment rescheduling guidance.", group: "Appointments & salon" },
  { slug: "matted-coats", title: "Matted Coats", description: "Safety-first handling and de-matting policy.", group: "Appointments & salon" },
  { slug: "vaccinations", title: "Vaccinations", description: "Required vaccination records for salon visits.", group: "Appointments & salon" },
  { slug: "refunds-returns", title: "Refunds & Returns", description: "Return eligibility and refund information.", group: "Shopping & orders" },
  { slug: "shipping-delivery", title: "Shipping & Delivery", description: "Order fulfillment, shipping, and delivery information.", group: "Shopping & orders" },
  { slug: "privacy-policy", title: "Privacy Policy", description: "How All About Pawz collects, uses, and protects personal information.", group: "Privacy & website" },
  { slug: "terms-of-service", title: "Terms of Service", description: "Terms governing use of All About Pawz services and website.", group: "Privacy & website" },
  { slug: "terms-of-use", title: "Terms of Use", description: "Rules and conditions for using this website.", group: "Privacy & website" },
  { slug: "accessibility", title: "Accessibility", description: "Accessibility commitment and assistance information.", group: "Privacy & website" },
]

export function legalDocumentBySlug(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug)
}
