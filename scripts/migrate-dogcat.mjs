// One-off migration: eliminate the shared "Dog|Cat" taxonomy tree (owner ruling:
// "dog and cat don't share the same route"). 737 published products live under
// Dog|Cat — 7 are cat-named and move to Cat, the rest are the dog grooming
// assortment and merge into the Dog tree. Emptied Dog|Cat nodes are deleted
// (their node_filters / node_filter_values first).
import pg from "pg"
import { readFileSync } from "node:fs"

const env = readFileSync(new URL("../.env", import.meta.url), "utf8")
const line = env.split("\n").find((l) => l.startsWith("SUPABASE_SESSION_POOLER="))
const cs = line ? line.slice("SUPABASE_SESSION_POOLER=".length).trim() : ""

const pool = new pg.Pool({
  connectionString: cs,
  max: 1,
  ssl: cs.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 8000,
  query_timeout: 60000,
})

// --- constants (verified via dbq) -------------------------------------------
const ROOT = "9a958d86-5a54-452a-8c8a-a6dba7bf8132" // Dog|Cat (depth 1)
const DOG_GROOMING = "83096344-14d4-5f5f-9236-c0b85ca7f8e9" // Dog / Grooming (d2)
const DOG_TOYS = "9cb621cd-f0de-5726-bca7-e9ffd660b366" // Dog / Toys (d2)
const CAT_GROOMING_BATHING = "249574ee-9b59-48c9-a59a-87893c3ef20a" // Cat / Cat Grooming & Bathing (d2)
const DOG_NAIL_CARE = "20e625f6-dc18-4174-ab83-073572ec3072" // Dog/Grooming/Nail Care (d3)
const DOG_SHAMPOOS = "76760f89-769a-4f4e-b064-3addfe5b246c" // Dog/Grooming/Shampoos & Conditioners (d3)
const DOG_BLANKETS = "9cfa6509-fd00-4021-a855-9069253eea96" // Dog/Beds & Furniture/Blankets & Throws (d3)

// Dog|Cat/Grooming (d2) children that move wholesale under Dog/Grooming
// (no name collision with existing Dog/Grooming children).
const REPARENT_TO_DOG_GROOMING = [
  "eb78362e-1deb-4f46-bcf8-dfa8e024cfd9", // Professional Grooming (602)
  "61f516cd-efaa-4c08-b71b-fcbcfc77b2a8", // Brushes & Combs (16)
  "38e24d6c-15a0-4781-94d2-e6ae66052035", // Grooming Sets (11)
  "0496588d-ff65-4e18-9798-f71bab79f36a", // Grooming Supplies (23; d4 children follow)
  "d27d2f85-20af-47f1-984e-ebbe6a19273d", // Dryers (1)
  "b9915238-c73f-4f28-882d-1836d7c61f6a", // Foams & Waterless (4)
  "2cb207e8-27c6-4843-ac39-5d3a3d692f60", // Travel & Containers (4)
  "7d05b946-7d48-46b1-b6d3-83355bb6c85c", // Value Sets (13)
  "5ea4abd2-f489-435f-8964-ffe424f58582", // Balms & Paw Care (1)
]

// Nodes deleted at the end (emptied / obsolete Dog|Cat nodes).
const DELETE_NODES = [
  ROOT, // Dog|Cat
  "420c9e25-af48-4364-b8cf-9dab1e421252", // Grooming (d2, emptied)
  "2f6fb00e-ebc2-48b6-81de-d1d522a0302e", // Beds & Furniture (d2)
  "a769495c-e271-4d4c-b03e-ac4f06f23676", // Bowls & Feeding (d2)
  "8e797fee-66b1-4f35-891e-e14b1ad556ed", // Toys (d2)
  "f3a25a12-6d5f-48eb-92b7-ce5b5c1f40d7", // Toys / Toys (d3)
  "49ac9392-a14d-48d3-baf7-3d0490d6cdf9", // Beds & Furniture / Beds (d3)
  "20a1b378-b902-4dda-8407-008eb10b927d", // Calming & Anxiety Beds (d3)
  "98991695-82e5-4b3c-9867-a29e01059cd1", // Blankets & Throws (d3 — merged into Dog)
  "da1387d1-2794-4061-8768-214cb629d1a1", // Sprays & Deodorizers (d3, empty)
  "ef0cc68c-cf66-4551-8f25-5237feae4f91", // Wipes (d3, empty)
  "f361a569-dcfb-42d9-bb49-ef3ff2dca0b8", // Nail Care (d3 — merged into Dog)
  "3d12f9d4-3134-4889-b471-9c54e5f86515", // Nail Clippers & Files (d4)
  "0ba281fc-68ef-4578-9d48-646fa45fab05", // Nail Polish (d4)
  "a83cf582-8109-46b0-a011-b1beb49a6aaa", // Shampoos & Conditioners (d3 — merged into Dog)
]

const inList = (ids) => ids.map((id) => `'${id}'`).join(", ")

async function run(label, sql) {
  const { rowCount } = await pool.query(sql)
  console.log(`${label}: ${rowCount} row(s)`)
}

try {
  await pool.query("BEGIN")

  // 1. The 7 cat-named products → Cat / Cat Grooming & Bathing.
  await run(
    "cat products → Cat/Grooming & Bathing",
    `WITH RECURSIVE sub AS (
       SELECT id FROM taxonomy_nodes WHERE id = '${ROOT}'
       UNION ALL SELECT tn.id FROM taxonomy_nodes tn JOIN sub ON tn.parent_id = sub.id
     )
     UPDATE products p SET category_id = '${CAT_GROOMING_BATHING}'
     WHERE p.category_id IN (SELECT id FROM sub)
       AND p.name ~* '\\mcat\\M|\\mkitten\\M'`,
  )

  // 2. Name-collision merges → existing Dog nodes.
  await run("Nail Care products → Dog/Grooming/Nail Care", `UPDATE products SET category_id='${DOG_NAIL_CARE}' WHERE category_id='f361a569-dcfb-42d9-bb49-ef3ff2dca0b8'`)
  await run("Shampoos products → Dog/Grooming/Shampoos & Conditioners", `UPDATE products SET category_id='${DOG_SHAMPOOS}' WHERE category_id='a83cf582-8109-46b0-a011-b1beb49a6aaa'`)
  await run("Blankets & Throws products → Dog/Beds & Furniture/Blankets & Throws", `UPDATE products SET category_id='${DOG_BLANKETS}' WHERE category_id='98991695-82e5-4b3c-9867-a29e01059cd1'`)
  await run("Toys product → Dog/Toys", `UPDATE products SET category_id='${DOG_TOYS}' WHERE category_id IN ('8e797fee-66b1-4f35-891e-e14b1ad556ed','f3a25a12-6d5f-48eb-92b7-ce5b5c1f40d7')`)

  // 3. Any other stragglers in emptied non-grooming d2 trees → safe Dog homes.
  await run(
    "stragglers in Beds & Furniture / Bowls & Feeding → Dog equivalents",
    `WITH RECURSIVE sub AS (
       SELECT id FROM taxonomy_nodes WHERE id IN ('2f6fb00e-ebc2-48b6-81de-d1d522a0302e','a769495c-e271-4d4c-b03e-ac4f06f23676')
       UNION ALL SELECT tn.id FROM taxonomy_nodes tn JOIN sub ON tn.parent_id = sub.id
     )
     UPDATE products p SET category_id = CASE
       WHEN p.name ~* '\\mcat\\M|\\mkitten\\M' THEN '64650a5a-22d5-5680-9cb5-94cc5457f43b'::uuid -- Cat/Beds & Furniture
       ELSE 'ec2326eb-d40c-51c7-a72a-188fb3911dfe'::uuid END -- Dog/Beds & Furniture
     WHERE p.category_id IN (SELECT id FROM sub)
       AND p.category_id IN (SELECT id FROM taxonomy_nodes WHERE parent_id = '2f6fb00e-ebc2-48b6-81de-d1d522a0302e')`,
  )

  // 4. Re-parent the grooming subtree under Dog/Grooming.
  await run(
    "re-parent grooming d3 nodes → Dog/Grooming",
    `UPDATE taxonomy_nodes SET parent_id = '${DOG_GROOMING}'
     WHERE id IN (${inList(REPARENT_TO_DOG_GROOMING)})`,
  )

  // 5. Clean filters for deleted nodes, then delete the nodes.
  await run(
    "node_filter_values (deleted nodes)",
    `DELETE FROM node_filter_values WHERE node_filter_id IN (
       SELECT id FROM node_filters WHERE node_id IN (${inList(DELETE_NODES)}))`,
  )
  await run("node_filters (deleted nodes)", `DELETE FROM node_filters WHERE node_id IN (${inList(DELETE_NODES)})`)
  await run("taxonomy_nodes (Dog|Cat tree remnants)", `DELETE FROM taxonomy_nodes WHERE id IN (${inList(DELETE_NODES)})`)

  // 6. Verification.
  const { rows: leftover } = await pool.query(
    `SELECT count(*)::int AS n FROM products WHERE category_id IN (
       SELECT id FROM taxonomy_nodes WHERE slug = 'dog-cat' OR parent_id IS NULL AND slug = 'dog-cat')`,
  )
  console.log("products still under dog-cat root:", leftover[0]?.n)
  const { rows: check } = await pool.query(
    `SELECT count(*)::int AS products FROM products p
      JOIN taxonomy_nodes tn ON p.category_id = tn.id
      JOIN taxonomy_nodes d1 ON d1.id = (
        WITH RECURSIVE up AS (
          SELECT id, parent_id FROM taxonomy_nodes WHERE id = tn.id
          UNION ALL SELECT tn2.id, tn2.parent_id FROM taxonomy_nodes tn2 JOIN up ON tn2.id = up.parent_id
        )
        SELECT id FROM up WHERE parent_id IS NULL
      )
      WHERE d1.slug = 'dog-cat'`,
  )
  console.log("products whose depth-1 ancestor is dog-cat:", check[0]?.products)

  await pool.query("COMMIT")
  console.log("DONE — committed")
} catch (e) {
  await pool.query("ROLLBACK")
  console.error("FAILED — rolled back:", e.message)
  process.exit(1)
} finally {
  await pool.end()
}
