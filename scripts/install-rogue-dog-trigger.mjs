// Install a rogue trigger with an UNKNOWN name (future-regression simulation)
// on dogs that breaks inserts. The guard won't know it by name — the write
// must then fail with the FRIENDLY message, never raw Postgres JSON.
import pg from "pg"

const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION

async function main() {
  const client = new pg.Client({ connectionString: cs })
  await client.connect()
  await client.query(`
    CREATE OR REPLACE FUNCTION public.rogue_future_regression()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      INSERT INTO public.platform_customer_identity_links (tenant_id, crm_customer_id, acct_customer_id)
      VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, NEW.id);
      RETURN NEW;
    END $$`)
  await client.query(`DROP TRIGGER IF EXISTS trg_rogue_test ON public.dogs`)
  await client.query(`CREATE TRIGGER trg_rogue_test AFTER INSERT ON public.dogs FOR EACH ROW EXECUTE FUNCTION public.rogue_future_regression()`)
  console.log("rogue unknown-name trigger installed on dogs")
  await client.end()
}

main().catch((e) => { console.error("FAIL:", e.message); process.exit(1) })
