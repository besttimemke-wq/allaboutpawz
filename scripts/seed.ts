/**
 * Seed script — pushes schema and ensures the LSH exemplar pathway exists.
 * Run with: bun run scripts/seed.ts
 * Idempotent: re-running upserts LSH by code.
 */
import { db } from "../src/lib/db";
import { buildLSHPathway } from "../src/lib/seed-data";
import { validatePathwayShape } from "../src/lib/framework/types";

async function main() {
  console.log("→ Building LSH pathway from framework...");
  const lsh = buildLSHPathway();

  const errs = validatePathwayShape(lsh);
  if (errs.length) {
    console.error("✖ Framework validation failed:\n" + errs.map((e) => "  - " + e).join("\n"));
    process.exit(1);
  }
  console.log(
    `✓ Framework valid: ${lsh.levels.length} levels, ${lsh.levels.reduce(
      (n, l) => n + l.modules.length,
      0,
    )} modules, ${lsh.totalHours}h, ${lsh.ceus} CEU.`,
  );

  console.log("→ Upserting LSH into database...");
  await db.course.upsert({
    where: { code: lsh.code },
    create: {
      code: lsh.code,
      title: lsh.title,
      subtitle: lsh.subtitle,
      description: lsh.description,
      missionAlignment: lsh.missionAlignment,
      totalHours: lsh.totalHours,
      ceus: lsh.ceus,
      scormPackageId: lsh.scormPackageId,
      accreditation: JSON.stringify(lsh.accreditation),
      status: "published",
      aiGenerated: false,
      data: JSON.stringify(lsh),
    },
    update: {
      title: lsh.title,
      subtitle: lsh.subtitle,
      description: lsh.description,
      missionAlignment: lsh.missionAlignment,
      totalHours: lsh.totalHours,
      ceus: lsh.ceus,
      scormPackageId: lsh.scormPackageId,
      accreditation: JSON.stringify(lsh.accreditation),
      status: "published",
      data: JSON.stringify(lsh),
    },
  });

  const count = await db.course.count();
  console.log(`✓ Done. Courses in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
