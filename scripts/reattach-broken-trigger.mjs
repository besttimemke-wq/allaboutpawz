// Recreate the EXACT broken live-only trigger from the production incident
// (42804: inserts customers.id TEXT into platform_customer_identity_links.
// acct_customer_id UUID, fires when the email matches a crm_customers row).
// Used ONLY to E2E-verify the self-heal guard, then the guard itself drops it.
import pg from "pg"

const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION

async function main() {
  const client = new pg.Client({ connectionString: cs })
  await client.connect()

  await client.query(`
    CREATE OR REPLACE FUNCTION public.handle_sync_customer_identities()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      INSERT INTO public.platform_customer_identity_links (tenant_id, crm_customer_id, acct_customer_id)
      VALUES (
        NEW.tenant_id,
        (SELECT id FROM public.crm_customers WHERE lower(email) = lower(NEW.email) LIMIT 1),
        (SELECT id FROM public.customers WHERE lower(email) = lower(NEW.email) AND id <> NEW.id LIMIT 1)
      );
      RETURN NEW;
    END $$`)
  await client.query(`
    DROP TRIGGER IF EXISTS trigger_sync_customer_identities ON public.customers`)
  await client.query(`
    CREATE TRIGGER trigger_sync_customer_identities
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_sync_customer_identities()`)

  const check = await client.query(`
    SELECT t.tgname FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname='public' AND c.relname='customers'`)
  console.log("BROKEN TRIGGER INSTALLED:", check.rows.map((r) => r.tgname).join(", ") || "(none!)")
  await client.end()
}

main().catch((e) => { console.error("SETUP FAIL:", e.message); process.exit(1) })
