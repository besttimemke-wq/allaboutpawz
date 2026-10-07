// ---------------------------------------------------------------------------
// Marketing mailer (sales / discount coupons). Includes the unsubscribe
// footer — CAN-SPAM style — and honest fine print, unlike the transactional
// templates which never carry unsubscribe links.
// ---------------------------------------------------------------------------

import { BRAND, button, detailsCard, eyebrow, h1, heroBand, noteBox, p, frame, esc } from "../design"

export interface CouponMailerData {
  firstName: string
  eyebrowText: string
  headline: string
  subline: string
  offerCode: string
  offerDetails: string
  validThrough: string
  finePrint?: string
  ctaLabel?: string
  ctaUrl?: string
}

export function couponMailerHtml(d: CouponMailerData): string {
  return frame({
    marketing: true,
    preheader: `${esc(d.subline)} — code ${esc(d.offerCode)}.`,
    body: [
      heroBand(d.eyebrowText, d.headline, esc(d.subline)),
      `<div style="height:8px;"></div>`,
      eyebrow(`A treat for you, ${esc(d.firstName)}`),
      p(`Because the best-behaved clients deserve the best treats (and we're not above bribery). Here's a little something for your next visit:`),
      detailsCard("Your offer", [
        { label: "Promo code", value: esc(d.offerCode), big: true },
        { label: "The deal", value: esc(d.offerDetails) },
        { label: "Good through", value: esc(d.validThrough) },
      ]),
      button(d.ctaUrl || BRAND.bookUrl, d.ctaLabel || "Book with my code"),
      noteBox(
        d.finePrint ||
          `One code per visit. Applies to new bookings made online during the offer window. Can't be combined with other offers or applied to past visits. Mention the code at checkout or enter it when booking — the salon crew can also apply it for you at the seller.`,
        "gold"
      ),
      p(`Questions? Just reply to this email — it comes straight to the salon.`, { muted: true, small: true }),
    ].join(""),
    reason: `You're receiving this because you opted in to news and offers from All About Pawz.`,
  })
}

export const SAMPLE_COUPON: CouponMailerData = {
  firstName: "Brea",
  eyebrowText: "A note from your groomer",
  headline: "Spring Fluff-Up",
  subline: "20% off every groom, April showers optional.",
  offerCode: "SPRING20",
  offerDetails: "20% off any grooming service booked online",
  validThrough: "Sunday, April 30",
  ctaLabel: "Book my fluff-up",
}
