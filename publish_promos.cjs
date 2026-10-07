// Publish promos on the All About Pawz tenant
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');

fs.readFileSync('/home/z/my-project/.env', 'utf8').split('\n').forEach(l => {
  const cleaned = l.replace(/\r$/, '');
  const m = cleaned.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});

const pool = new Pool({
  connectionString: process.env.SUPABASE_SESSION_POOLER,
  ssl: { rejectUnauthorized: false },
});

const TID = 'b2a3b20c-9816-5518-92db-f9395c063acd';

const promos = [
  { name: 'First Groom 10% Off', code: 'PAWZ10', applies: ['services','addons'], places: ['shop','services','book'], desc: 'Get 10% off your first grooming appointment at All About Pawz Memphis!', cta: 'Book Now' },
  { name: 'Bath Club 15% Off Retail', code: 'BATHCLUB15', applies: ['products'], places: ['shop','pricing'], desc: 'Bath Club members save 15% on all retail purchases', cta: 'Shop Now' },
  { name: 'Free Nail Trim with Any Groom', code: 'FREENAILS', applies: ['addons'], places: ['services','book'], desc: 'Free nail trim added to any grooming service this month', cta: 'Book Now' },
];

(async () => {
  let inserted = 0;
  for (const pr of promos) {
    try {
      const res = await pool.query(
        `INSERT INTO promos (id, tenant_id, name, code, kind, promo_type, value, applies_to, eligibility, placements, status, description, cta_label, starts_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'standard', 'percent_off', '10', $4, 'all', $5, 'published', $6, $7, now(), now(), now())
         ON CONFLICT DO NOTHING`,
        [TID, pr.name, pr.code, JSON.stringify(pr.applies), JSON.stringify(pr.places), pr.desc, pr.cta]
      );
      inserted += res.rowCount;
    } catch (e) {
      console.log('ERR ' + pr.name + ': ' + e.message.slice(0, 120));
    }
  }
  console.log('inserted:', inserted);

  const check = await pool.query('SELECT name, code, status FROM promos WHERE tenant_id = $1', [TID]);
  console.log('=== PROMOS ON AAPAWZ TENANT ===');
  check.rows.forEach(r => console.log('  ' + r.name + ' | ' + r.code + ' | ' + r.status));

  // Test the API
  const fetch = require('node:https');
  console.log('\n=== API CHECK ===');
  console.log('Test: curl /api/promos/eligible?placement=shop');

  await pool.end();
})();
