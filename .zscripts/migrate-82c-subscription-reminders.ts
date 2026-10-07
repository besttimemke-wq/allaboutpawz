// ============================================================================
// 82-c — subscription renewal-reminder idempotency columns.
// The daily reminder cron (src/app/api/cron/subscription-reminders) marks each
// membership with the period it already reminded for, so a second sweep the
// same day (or a Vercel retry) sends nothing new.
// Idempotent. Run: bun .zscripts/migrate-82c-subscription-reminders.ts
// ============================================================================
import { pgExec, pgQuery } from "../src/lib/pg"

async function main() {
  const a = await pgExec(
    `alter table public.subscriptions add column if not exists reminder_sent_period timestamptz`,
  )
  const b = await pgExec(
    `alter table public.subscriptions add column if not exists reminder_sent_at timestamptz`,
  )
  console.log(`[1] reminder_sent_period added (${a} — 0 means already existed), reminder_sent_at added (${b} — 0 means already existed)`)

  const cols = await pgQuery<any>(
    `select column_name, data_type from information_schema.columns
     where table_schema = 'public' and table_name = 'subscriptions'
       and column_name in ('reminder_sent_period','reminder_sent_at')`,
  )
  for (const c of cols) console.log(`  ${c.column_name}: ${c.data_type}`)
  process.exit(0)
}
main()
