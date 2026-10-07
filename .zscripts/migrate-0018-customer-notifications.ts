// ============================================================================
// 84 — customer_notifications: the in-app notification center that backs the
// customer portal's notification bell. Every customer-facing email the salon
// sends ALSO lands here as an in-app notification (a copy of the invoice,
// the order receipt, the appointment-day communication) so the customer can
// always find what they were emailed, inside their portal.
//
// Column naming follows the repo's legacy convention (camelCase quoted
// identifiers — same as email_messages/bookings/customers), because the
// PostgREST repo helper (src/lib/repo.ts) writes camelCase keys directly.
//
// Idempotent. Run: bun .zscripts/migrate-0018-customer-notifications.ts
// (after DDL, PostgREST's schema cache reloads via NOTIFY pgrst.)
// ============================================================================
import { pgExec, pgQuery } from "../src/lib/pg"

async function main() {
  const a = await pgExec(
    `create table if not exists public.customer_notifications (
      id text primary key default gen_random_uuid()::text,
      tenant_id uuid not null default '00000000-0000-0000-0000-000000000001',
      "customerId" text not null,
      "type" text not null,
      "title" text not null,
      "body" text,
      "link" text,
      "relatedId" text,
      "readAt" timestamptz,
      "createdAt" timestamptz not null default now()
    )`,
  )
  console.log(`[1] customer_notifications ensured (${a} — 0 means already existed)`)

  await pgExec(
    `create index if not exists customer_notifications_owner_idx
       on public.customer_notifications (tenant_id, "customerId", "createdAt" desc)`,
  )
  await pgExec(
    `create index if not exists customer_notifications_unread_idx
       on public.customer_notifications ("customerId", "readAt") where "readAt" is null`,
  )
  console.log("[2] indexes ensured (owner + partial unread)")

  // Row-level security: a customer reads ONLY their own notifications; all
  // writes go through the service-role key (the app never writes with the
  // anon key), so write policies stay closed.
  await pgExec(`alter table public.customer_notifications enable row level security`)
  await pgExec(
    `drop policy if exists "customers read own notifications" on public.customer_notifications`,
  )
  await pgExec(
    `create policy "customers read own notifications" on public.customer_notifications
       for select using (
         "customerId" in (
           select c.id from public.customers c
           where lower(c.email) = lower(auth.jwt() ->> 'email')
             or c."userId" = (auth.jwt() ->> 'sub')
         )
       )`,
  )
  console.log("[3] RLS enabled + read-own policy")

  // PostgREST caches the schema — make the new table/columns visible now.
  await pgExec(`NOTIFY pgrst, 'reload schema'`).catch(() => {})
  console.log("[4] pgrst schema-cache reload notified")

  const cols = await pgQuery<any>(
    `select column_name, data_type, is_nullable from information_schema.columns
     where table_schema = 'public' and table_name = 'customer_notifications'
     order by ordinal_position`,
  )
  for (const c of cols) console.log(`  ${c.column_name}: ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}`)
  process.exit(0)
}
main()
