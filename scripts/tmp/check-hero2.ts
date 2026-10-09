import { pgQuery } from "../../src/lib/pg"
async function main() {
  const rows = await pgQuery<any>(`
    SELECT a.slug AS animal, g.slug AS grp, count(*)::int AS subs,
           count(s.hero_image_url)::int AS with_hero
    FROM taxonomy_nodes g
    JOIN taxonomy_nodes a ON a.id = g.parent_id AND a.depth = 1 AND a.status='published'
    JOIN taxonomy_nodes s ON s.parent_id = g.id AND s.status='published'
    WHERE g.status='published' AND a.slug IN ('dog','cat')
    GROUP BY a.slug, g.slug ORDER BY a.slug, g.slug`)
  for (const row of rows) console.log(`${row.animal}/${row.grp}: ${row.with_hero}/${row.subs}`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
