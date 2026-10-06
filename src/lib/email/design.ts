// ---------------------------------------------------------------------------
// All About Pawz — professional email design system.
//
// Every email the salon sends (Resend transactional + Supabase Auth
// paste-in templates) renders through this one frame so the whole brand
// looks polished and consistent: ink header with the gold paw wordmark,
// nav strip, serif headings, detail cards, bulletproof CTAs, and a real
// footer with the salon's address, hours and contact info.
//
// Pure string builders — no React, no server-only deps — safe to call from
// API routes, cron automations, and preview tooling alike.
// ---------------------------------------------------------------------------

import { SITE_URL } from "../site-url"

// ---- Brand -----------------------------------------------------------------

export const BRAND = {
  name: "All About Pawz",
  legalName: "All About Pawz LLC",
  tagline: "From Pawz to PAWfection",
  city: "Memphis, TN",
  phone: "901-800-7182",
  email: "help@aapawz.com",
  bookingEmail: "booking@aapawz.com",
  url: SITE_URL,
  pawImg: `${SITE_URL}/brand/email-paw.png`,
  bookUrl: `${SITE_URL}/book/appointment`,
  servicesUrl: `${SITE_URL}/services`,
  shopUrl: `${SITE_URL}/shop`,
  learnUrl: `${SITE_URL}/learn`,
  portalUrl: `${SITE_URL}/access-customer`,
  helpUrl: `${SITE_URL}/contact`,
  hours: {
    tueSat: "9am – 6pm",
    sun: "10am – 4pm",
    mon: "Closed",
  },
} as const

// Exact brand palette (matches the site's cream/gold/ink tokens).
const C = {
  ink: "#1a1a1a",
  inkSoft: "#3f3a33",
  body: "#4a443c",
  muted: "#8d857a",
  cream: "#faf7f2",
  creamDeep: "#f1ebe0",
  outer: "#e9e2d4",
  white: "#ffffff",
  gold: "#9a7b3c",
  goldDeep: "#7d6229",
  goldLight: "#c9ab63",
  border: "#e5dcc9",
  brick: "#a33b2e",
  brickDeep: "#8c3226",
  sage: "#4f6a4a",
}

const SERIF = `Georgia,'Times New Roman',serif`
const SANS = `Helvetica,Arial,sans-serif`
const MONO = `'Courier New',Courier,monospace`

// ---- Escaping ---------------------------------------------------------------

export function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// ---- Building blocks ---------------------------------------------------------

/** Small gold uppercase eyebrow above the heading. */
export function eyebrow(text: string, tone: "gold" | "brick" | "sage" = "gold"): string {
  const color = tone === "brick" ? C.brick : tone === "sage" ? C.sage : C.gold
  return `<p class="em-eyebrow" style="margin:0 0 10px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${color}">${esc(text)}</p>`
}

/** Serif display heading. */
export function h1(text: string): string {
  return `<h1 class="em-h1" style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:1.22;font-weight:400;color:${C.ink}">${text}</h1>`
}

/** Serif sub-heading. */
export function h2(text: string): string {
  return `<h2 style="margin:26px 0 10px;font-family:${SERIF};font-size:20px;line-height:1.3;font-weight:400;color:${C.ink}">${text}</h2>`
}

/** Body paragraph. Pass already-escaped/HTML fragments when needed. */
export function p(text: string, opts: { muted?: boolean; small?: boolean; center?: boolean } = {}): string {
  const size = opts.small ? "12px" : "15px"
  const color = opts.muted ? C.muted : C.body
  const align = opts.center ? "text-align:center;" : ""
  return `<p class="em-p" style="margin:0 0 14px;font-family:${SANS};font-size:${size};line-height:1.65;color:${color};${align}">${text}</p>`
}

/** Italic gold tagline flourish. */
export function taglineFlourish(): string {
  return `<p style="margin:2px 0 18px;font-family:${SERIF};font-style:italic;font-size:18px;color:${C.gold}">${esc(BRAND.tagline)}</p>`
}

/** Gold paw divider. */
export function pawDivider(): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:26px 0"><tr>
    <td style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</td>
    <td width="46" align="center" style="padding:0 8px;"><img src="${BRAND.pawImg}" width="14" height="14" alt="" style="display:block"/></td>
    <td style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>`
}

export interface ButtonOpts {
  tone?: "gold" | "ink" | "brick"
  align?: "center" | "left"
}

/** Bulletproof CTA button (VML roundrect for Outlook + padded anchor). */
export function button(href: string, label: string, opts: ButtonOpts = {}): string {
  const tone = opts.tone || "gold"
  const bg = tone === "ink" ? C.ink : tone === "brick" ? C.brick : C.goldDeep
  const align = opts.align === "left" ? "left" : "center"
  const vmlW = Math.max(140, Math.round((label.length * 8.4 + 56) / 10) * 10)
  const anchor = `<a href="${href}" style="display:inline-block;padding:15px 34px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;color:${C.cream};background:${bg};border-radius:3px;">${esc(label)}</a>`
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:26px 0 10px;"><tr>
    <td align="${align}">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px;v-text-anchor:middle;width:${vmlW}px;" arcsize="7%" stroke="f" fillcolor="${bg}"><w:anchorlock/><center style="color:${C.cream};font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;">${esc(label)}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-->${anchor}<!--<![endif]-->
    </td>
  </tr></table>`
}

/** Small "or copy this link" fallback row for action-link emails. */
export function linkFallback(href: string, note = "If the button doesn't work, copy and paste this link into your browser:"): string {
  return `<p style="margin:14px 0 0;font-family:${SANS};font-size:11px;line-height:1.6;color:${C.muted}">${esc(note)}<br/><span style="color:${C.gold};word-break:break-all">${href}</span></p>`
}

export interface DetailRow {
  label: string
  value: string
  /** Render value large (amounts). */
  big?: boolean
}

/** White detail card with label/value rows — the "receipt" centerpiece. */
export function detailsCard(title: string | null, rows: DetailRow[], opts: { tone?: "gold" | "brick" | "sage"; footer?: string } = {}): string {
  const accent = opts.tone === "brick" ? C.brick : opts.tone === "sage" ? C.sage : C.gold
  const header = title
    ? `<tr><td style="padding:16px 22px 12px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${accent};">${esc(title)}</td></tr>`
    : ""
  const body = rows
    .map(
      (r, i) => `<tr>
      <td style="padding:${i === 0 && !title ? "16px" : "10px"} 22px 4px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.muted};">${esc(r.label)}</td>
    </tr>
    <tr>
      <td style="padding:0 22px${i < rows.length - 1 ? ";border-bottom:1px solid #f0ebdf" : ""};font-family:${r.big ? SERIF : SANS};font-size:${r.big ? "26px" : "15px"};font-weight:${r.big ? "400" : "600"};line-height:1.35;color:${C.ink}">${r.value}</td>
    </tr>`
    )
    .join("")
  const footer = opts.footer
    ? `<tr><td style="padding:14px 22px 18px;font-family:${SANS};font-size:11.5px;line-height:1.6;color:${C.muted};border-top:1px solid #f0ebdf">${opts.footer}</td></tr>`
    : ""
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${C.white};border:1px solid ${C.border};border-top:3px solid ${accent};">
    ${header}${body}${footer}
  </table>`
}

/** Numbered step list. */
export function steps(items: { title: string; body?: string }[]): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${C.white};border:1px solid ${C.border};">
    ${items
      .map(
        (it) => `<tr>
        <td width="52" align="center" valign="top" style="padding:18px 0 4px 18px;">
          <div style="width:26px;height:26px;line-height:26px;border-radius:50%;background:${C.ink};color:${C.cream};font-family:${SANS};font-size:12px;font-weight:700;">${items.indexOf(it) + 1}</div>
        </td>
        <td valign="top" style="padding:16px 20px 16px 10px;">
          <div style="font-family:${SANS};font-size:14px;font-weight:700;color:${C.ink};margin-bottom:3px;">${it.title}</div>
          ${it.body ? `<div style="font-family:${SANS};font-size:12.5px;line-height:1.6;color:${C.body};">${it.body}</div>` : ""}
        </td>
      </tr>`
      )
      .join("")}
  </table>`
}

/** Line items table for order confirmations. */
export function lineItems(items: { name: string; qty: string | number; price: string }[], totals: { label: string; value: string; strong?: boolean }[]): string {
  const rows = items
    .map(
      (it) => `<tr>
      <td style="padding:12px 22px;font-family:${SANS};font-size:14px;color:${C.ink};border-bottom:1px solid #f0ebdf;">${it.name}</td>
      <td align="center" width="70" style="padding:12px 8px;font-family:${SANS};font-size:13px;color:${C.body};border-bottom:1px solid #f0ebdf;">×&nbsp;${esc(String(it.qty))}</td>
      <td align="right" width="110" style="padding:12px 22px;font-family:${SANS};font-size:14px;font-weight:600;color:${C.ink};border-bottom:1px solid #f0ebdf;">${it.price}</td>
    </tr>`
    )
    .join("")
  const totalsRows = totals
    .map(
      (t) => `<tr>
      <td colspan="2" style="padding:${t.strong ? "14px" : "8px"} 22px 4px;font-family:${SANS};font-size:${t.strong ? "13px" : "12px"};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${t.strong ? C.ink : C.muted};text-align:right;">${esc(t.label)}</td>
      <td align="right" style="padding:${t.strong ? "14px" : "8px"} 22px 4px;font-family:${t.strong ? SERIF : SANS};font-size:${t.strong ? "22px" : "13px"};font-weight:${t.strong ? "400" : "600"};color:${C.ink};">${t.value}</td>
    </tr>`
    )
    .join("")
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${C.white};border:1px solid ${C.border};">
    <tr><td colspan="3" style="padding:16px 22px 8px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${C.gold};">Your items</td></tr>
    ${rows}${totalsRows}
    <tr><td colspan="3" style="padding:8px 22px 16px;"></td></tr>
  </table>`
}

/** One-time code display (OTP / magic-link emails). */
export function otpCode(code: string, note?: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${C.white};border:1px dashed ${C.goldLight};">
    <tr><td align="center" style="padding:22px 16px 8px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${C.gold};">Your one-time code</td></tr>
    <tr><td align="center" style="padding:0 16px 10px;font-family:${MONO};font-size:30px;font-weight:700;letter-spacing:9px;color:${C.ink};">${esc(code)}</td></tr>
    ${note ? `<tr><td align="center" style="padding:0 16px 18px;font-family:${SANS};font-size:11.5px;color:${C.muted};">${esc(note)}</td></tr>` : `<tr><td style="padding:0 0 14px;"></td></tr>`}
  </table>`
}

/** Warm callout box for policies / reassurance notes. */
export function noteBox(text: string, tone: "gold" | "brick" | "sage" = "gold"): string {
  const accent = tone === "brick" ? C.brick : tone === "sage" ? C.sage : C.gold
  const bg = tone === "brick" ? "#faf0ee" : tone === "sage" ? "#f0f4ef" : "#f7f2e6"
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${bg};border-left:3px solid ${accent};">
    <tr><td style="padding:14px 18px;font-family:${SANS};font-size:12.5px;line-height:1.65;color:${C.inkSoft};">${text}</td></tr>
  </table>`
}

/** Marketing hero band (gold deep, serif display copy). */
export function heroBand(eyebrowText: string, headline: string, sub?: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${C.goldDeep}">
    <tr><td align="center" style="padding:34px 24px 30px;">
      <img src="${BRAND.pawImg}" width="26" height="26" alt="" style="display:block;margin:0 auto 12px;"/>
      <div style="font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:${C.goldLight};">${esc(eyebrowText)}</div>
      <div class="em-h1" style="margin:10px 0 0;font-family:${SERIF};font-size:30px;line-height:1.2;color:${C.cream};">${headline}</div>
      ${sub ? `<div style="margin:10px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:#e8dfc9;">${sub}</div>` : ""}
    </td></tr>
  </table>`
}

// ---- The frame ---------------------------------------------------------------

export interface FrameOpts {
  /** Hidden preview text shown after the subject in the inbox. */
  preheader?: string
  /** Inner HTML body (already composed from the blocks above). */
  body: string
  /** Show the BOOK · SERVICES · SHOP · LEARN nav strip. Default true. */
  nav?: boolean
  /** Marketing emails get an unsubscribe link in the footer. */
  marketing?: boolean
  /** Why is this person receiving this — shown as fine print. */
  reason?: string
  /** Learning Center emails badge the header wordmark. */
  academy?: boolean
}

/** Full email document — header, nav, content, footer. */
export function frame(opts: FrameOpts): string {
  const preheader = opts.preheader
    ? `<div style="display:none;font-size:1px;color:${C.outer};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(opts.preheader)}</div>`
    : ""
  const nav =
    opts.nav === false
      ? ""
      : `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${C.cream}">
    <tr><td align="center" class="em-nav" style="padding:11px 8px;border-bottom:1px solid ${C.border};font-family:${SANS};font-size:9px;font-weight:700;letter-spacing:0.18em;">
      <a href="${BRAND.bookUrl}" style="color:${C.goldDeep};text-decoration:none;">BOOK</a><span style="color:${C.goldLight};padding:0 9px;">·</span><a href="${BRAND.servicesUrl}" style="color:${C.goldDeep};text-decoration:none;">SERVICES</a><span style="color:${C.goldLight};padding:0 9px;">·</span><a href="${BRAND.shopUrl}" style="color:${C.goldDeep};text-decoration:none;">SHOP</a><span style="color:${C.goldLight};padding:0 9px;">·</span><a href="${BRAND.learnUrl}" style="color:${C.goldDeep};text-decoration:none;">LEARN</a>
    </td></tr>
  </table>`
  const subMark = opts.academy
    ? `<div style="font-family:${SANS};font-size:9px;font-weight:700;letter-spacing:0.32em;color:${C.goldLight};margin-top:7px;">THE LEASHED LEARNING CENTER</div>`
    : `<div style="font-family:${SANS};font-size:9px;font-weight:700;letter-spacing:0.32em;color:${C.gold};margin-top:7px;">FROM PAWZ TO PAWFECTION</div>`
  const reason =
    opts.reason ||
    `You're receiving this email because you have an All About Pawz account or booked with us.`
  const unsub = opts.marketing
    ? `<div style="margin:10px 0 0;font-family:${SANS};font-size:10px;line-height:1.7;color:${C.muted};"><a href="mailto:${BRAND.email}?subject=Unsubscribe%20from%20marketing%20emails" style="color:${C.gold};text-decoration:underline;">Unsubscribe from marketing emails</a> — transactional emails (bookings, receipts, account security) are always sent.</div>`
    : ""
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="x-apple-disable-message-reformatting"/>
<meta name="color-scheme" content="light only"/>
<meta name="supported-color-schemes" content="light only"/>
<title>All About Pawz</title>
<style>
  body{margin:0;padding:0;width:100%!important;min-width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table{border-collapse:collapse;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
  a{color:${C.goldDeep};}
  @media only screen and (max-width:620px){
    .em-container{width:100%!important;}
    .em-content{padding:30px 22px!important;}
    .em-h1{font-size:23px!important;}
    .em-nav a{padding:0 5px!important;}
    .em-p{font-size:14px!important;}
    .em-hide-mobile{display:none!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.outer};">
${preheader}
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${C.outer}">
  <tr>
    <td align="center" style="padding:26px 10px 34px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="em-container" style="width:600px;max-width:600px;background:${C.cream};border:1px solid ${C.border};">
        <!-- Header -->
        <tr>
          <td bgcolor="${C.ink}" align="center" style="padding:26px 20px 22px;">
            <img src="${BRAND.pawImg}" width="34" height="34" alt="All About Pawz" style="display:block;margin:0 auto 10px;"/>
            <div style="font-family:${SERIF};font-size:17px;letter-spacing:0.22em;color:${C.cream};">ALL ABOUT PAWZ</div>
            ${subMark}
          </td>
        </tr>
        ${nav ? `<tr><td>${nav}</td></tr>` : ""}
        <!-- Content -->
        <tr>
          <td class="em-content" style="padding:38px 44px 42px;background:${C.cream};">
            ${opts.body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td bgcolor="${C.creamDeep}" align="center" style="padding:32px 24px 26px;border-top:1px solid ${C.border};">
            <img src="${BRAND.pawImg}" width="16" height="16" alt="" style="display:block;margin:0 auto 8px;"/>
            <div style="font-family:${SERIF};font-size:12px;letter-spacing:0.2em;color:${C.ink};">ALL ABOUT PAWZ</div>
            <div style="margin:10px 0 0;font-family:${SANS};font-size:11px;line-height:1.8;color:#6b6255;">
              ${esc(BRAND.legalName)} · ${esc(BRAND.city)}<br/>
              <a href="tel:${BRAND.phone.replace(/-/g, "")}" style="color:#6b6255;text-decoration:none;">${BRAND.phone}</a> · <a href="mailto:${BRAND.email}" style="color:#6b6255;text-decoration:none;">${BRAND.email}</a><br/>
              Tue–Sat ${BRAND.hours.tueSat} · Sun ${BRAND.hours.sun} · Mon ${BRAND.hours.mon}
            </div>
            <div style="margin:12px 0 0;font-family:${SANS};font-size:11px;letter-spacing:0.08em;">
              <a href="${BRAND.url}" style="color:${C.goldDeep};text-decoration:none;">AAPAWZ.COM</a><span style="color:${C.goldLight};padding:0 8px;">·</span><a href="${BRAND.bookUrl}" style="color:${C.goldDeep};text-decoration:none;">BOOK</a><span style="color:${C.goldLight};padding:0 8px;">·</span><a href="${BRAND.helpUrl}" style="color:${C.goldDeep};text-decoration:none;">CONTACT</a>
            </div>
            <div style="margin:14px 0 0;border-top:1px solid ${C.border};padding-top:14px;font-family:${SANS};font-size:10px;line-height:1.7;color:${C.muted};">
              ${esc(reason)}<br/>${esc(BRAND.legalName)} · ${esc(BRAND.city)} · <a href="${BRAND.url}" style="color:${C.muted};text-decoration:none;">aapawz.com</a>
            </div>
            ${unsub}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
