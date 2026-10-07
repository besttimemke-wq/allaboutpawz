import { Pool } from "pg"
const cs = process.env.SUPABASE_SESSION_POOLER ?? ""
const pool = new Pool({ connectionString: cs, max: 1, ssl: { rejectUnauthorized: false } })
// Table is empty — rebuild it with the repo's camelCase convention
// (matches email_messages: customerId, relatedId, readAt, createdAt).
await pool.query(`drop table if exists public.customer_notifications cascade`)
await pool.query(`create table public.customer_notifications (
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
)`)
await pool.query(`create index customer_notifications_owner_idx on public.customer_notifications (tenant_id, "customerId", "createdAt" desc)`)
await pool.query(`create index customer_notifications_unread_idx on public.customer_notifications ("customerId", "readAt") where "readAt" is null`)
await pool.query(`alter table public.customer_notifications enable row level security`)
await pool.query(`drop policy if exists "customers read own notifications" on public.customer_notifications`)
await pool.query(`create policy "customers read own notifications" on public.customer_notifications
  for select using (
    "customerId" in (
      select c.id from public.customers c
      where lower(c.email) = lower(auth.jwt() ->> 'email')
        or c."userId" = (auth.jwt() ->> 'sub')
    )
  )`)
await pool.query(`NOTIFY pgrst, 'reload schema'`)
const c = await pool.query(`select column_name from information_schema.columns where table_schema='public' and table_name='customer_notifications' order by ordinal_position`)
console.log("columns:", c.rows.map(r => r.column_name).join(", "))
await pool.end()
