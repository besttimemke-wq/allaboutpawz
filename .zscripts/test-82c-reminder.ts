// 82-c verification — synthetic ACTIVE membership due in 2 days.
import { pgQuery, pgExec } from "../src/lib/pg"

const SMALL = "1c9a05c6-289d-4379-a678-97fd81f5b8c9"

async function main() {
  const cmd = process.argv[2] || "insert"
  if (cmd === "insert") {
    const rows = await pgQuery<{ id: string }>(
      `insert into public.subscriptions
         (plan_id, email, customer_id, dog_name, status, billing_interval,
          price_cents, visits_included, visits_used, current_period_start, current_period_end)
       values ($1, 'promos-e2e@aapawz.com', '57c21b39-6916-48b5-a769-cee8a5d7888c', 'RemindTest-82c',
               'ACTIVE', 'monthly', 12900, 4, 2, now(), now() + interval '2 days')
       returning id`,
      [SMALL],
    )
    console.log("MEMBERSHIP_ID=" + rows[0]?.id)
  } else if (cmd === "state") {
    const rows = await pgQuery<any>(
      `select id, dog_name, status, price_cents, billing_interval, reminder_sent_period, reminder_sent_at, current_period_end
       from public.subscriptions where dog_name = 'RemindTest-82c'`,
    )
    console.log(JSON.stringify(rows, null, 2))
  } else if (cmd === "emails") {
    const rows = await pgQuery<any>(
      `select id, "toEmail", template, subject, status, left(body, 0) as _
       from public.email_messages
       where template in ('subscription_renewal_reminder','subscription_plan_changed','subscription_plan_change')
         and "createdAt" > now() - interval '30 minutes'
       order by "createdAt" asc`,
    )
    console.log(JSON.stringify(rows.map(r => ({ id: r.id, to: r["toEmail"], tpl: r.template, subj: r.subject, st: r.status })), null, 2))
    const html = await pgQuery<{ body: string }>(
      `select body from public.email_messages
       where template = 'subscription_renewal_reminder' and "createdAt" > now() - interval '30 minutes'
       order by "createdAt" desc limit 1`,
    )
    const b = html[0]?.body || ""
    const markers = ["PAWFECTION BATH CLUB", "Your membership renews soon", "PAWfection Bath Club — Small", "RemindTest-82c", "$129", "per month", "2 / 4 this period", "/customer/orders/subscriptions", "Pause or cancel anytime in the portal"]
    console.log("HTML MARKERS:")
    for (const m of markers) console.log(`  ${b.includes(m) ? "OK " : "MISS"} ${m}`)
  } else if (cmd === "cleanup") {
    const n1 = await pgExec(`delete from public.subscriptions where dog_name = 'RemindTest-82c'`)
    const n2 = await pgExec(
      `delete from public.email_messages
       where template in ('subscription_renewal_reminder','subscription_plan_changed','subscription_plan_change')
         and "createdAt" > now() - interval '2 hours'`,
    )
    console.log(`deleted memberships=${n1} test emails=${n2}`)
  }
  process.exit(0)
}
main()
