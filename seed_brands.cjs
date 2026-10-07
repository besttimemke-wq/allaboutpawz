// Seed brands for the mega menu
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');

fs.readFileSync('/home/z/my-project/.env', 'utf8').split('\n').forEach(l => {
  const cleaned = l.replace(/\r$/, '');
  const m = cleaned.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});

const pool = new Pool({ connectionString: process.env.SUPABASE_SESSION_POOLER, ssl: { rejectUnauthorized: false } });
const TID = 'b2a3b20c-9816-5518-92db-f9395c063acd';

const brands = [
  { name: "All About Pawz", slug: "all-about-pawz", tier: "signature", desc: "Our signature line of grooming products" },
  { name: "Hill's Science Diet", slug: "hills-science-diet", tier: "premium", desc: "Veterinary-recommended nutrition" },
  { name: "Blue Buffalo", slug: "blue-buffalo", tier: "premium", desc: "Natural pet food" },
  { name: "Purina Pro Plan", slug: "purina-pro-plan", tier: "premium", desc: "Professional-grade nutrition" },
  { name: "Stella & Chewy's", slug: "stella-and-chewys", tier: "premium", desc: "Raw and freeze-dried nutrition" },
  { name: "The Honest Kitchen", slug: "the-honest-kitchen", tier: "premium", desc: "Human-grade pet food" },
  { name: "Merrick", slug: "merrick", tier: "premium", desc: "Grain-free nutrition" },
  { name: "Nulo", slug: "nulo", tier: "premium", desc: "High-protein, low-glycemic nutrition" },
  { name: "ACANA", slug: "acana", tier: "premium", desc: "Biologically appropriate nutrition" },
  { name: "Earthbath", slug: "earthbath", tier: "standard", desc: "Natural grooming products" },
  { name: "Burt's Bees Pets", slug: "burts-bees-pets", tier: "standard", desc: "Natural grooming and care" },
  { name: "Kong", slug: "kong", tier: "standard", desc: "Durable dog toys" },
];

(async () => {
  let inserted = 0;
  for (const b of brands) {
    try {
      const res = await pool.query(
        `INSERT INTO brands (id, tenant_id, name, slug, description, pricing_tier, status, published_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'draft', null, now(), now())`,
        [TID, b.name, b.slug, b.desc, b.tier]
      );
      inserted += res.rowCount;
    } catch (e) {
      if (e.message.includes('duplicate')) continue;
      console.log('ERR ' + b.name + ': ' + e.message.slice(0, 80));
    }
  }
  console.log('brands inserted:', inserted);
  const check = await pool.query('SELECT name, slug, pricing_tier FROM brands WHERE tenant_id = $1 ORDER BY name', [TID]);
  console.log('=== BRANDS ON AAPAWZ TENANT ===');
  check.rows.forEach(r => console.log('  ' + r.name + ' (' + r.slug + ') [' + r.pricing_tier + ']'));
  await pool.end();
})();
