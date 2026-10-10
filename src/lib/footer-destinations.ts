export const FOOTER_DESTINATIONS = {
  careers: { title: "Careers", description: "Learn about opportunities to care for pets and support their families at All About Pawz." },
  events: { title: "Events", description: "Find community gatherings, special promotions, and pet-centered events from All About Pawz." },
  "pet-adoption": { title: "Pet Adoption", description: "Connect with resources and next steps for welcoming a pet into your family." },
  "pet-insurance": { title: "Pet Insurance", description: "Explore pet insurance resources that can help families plan for care." },
  seller: { title: "Seller Program", description: "Learn how brands and local partners can work with All About Pawz." },
  sustainability: { title: "Sustainability", description: "See how All About Pawz approaches responsible pet care and business practices." },
  "veterinary-partners": { title: "Veterinary Partners", description: "Connect with veterinary partners and care resources for your pet." },
} as const

export function footerDestination(slug: string) {
  return FOOTER_DESTINATIONS[slug as keyof typeof FOOTER_DESTINATIONS]
}
