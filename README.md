# All About Pawz

Luxury dog grooming salon — public site, booking wizard, shop, customer
portal, and the DAWG admin/operations app. Supabase is the only backend;
Stripe handles the $25 booking deposit and shop checkout.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript 5
- **Tailwind CSS 4** + shadcn/ui (New York) + Phosphor & Lucide icons
- **Supabase** — 47 tables, auth, storage (see `supabase/schema.sql`)
- **Stripe** — checkout sessions + billing portal + webhook
- **Resend** — transactional email

## Getting started

```bash
bun install
cp .env.example .env   # fill in real values (see the file's notes)
bun run dev            # http://localhost:3000
```

The site renders even before env vars are set — Supabase reads simply
return empty data — so a fresh clone always boots.

## Key routes

| Route | What it is |
| --- | --- |
| `/` | Home |
| `/book` | Booking options (marketing page) |
| `/book/appointment` | Appointment wizard (9 steps, $25 deposit → Stripe) |
| `/book/consultation` | Free consultation wizard (own flow, no deposit) |
| `/shop` | Retail shop |
| `/account` | Customer portal |
| `/admin` | DAWG operations (login required) |

## Deploying to Vercel

Import the repo in Vercel — no build-time env vars required. Add the
production values from `.env.example` in the project's Environment
Variables to enable Supabase, Stripe, and email.
