/**
 * Seed partner organizations + support staff.
 * Run: bun run scripts/seed-partners.ts
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("→ Seeding partner organizations...");
  const partners = [
    { code: "PARTNER001", name: "Second Chance Reentry Program", type: "reentry-program", contactName: "Dana Williams", contactEmail: "dana@secondchance.org", contactPhone: "555-0100" },
    { code: "PARTNER002", name: "City Workforce Development Board", type: "workforce-board", contactName: "Mark Chen", contactEmail: "mchen@workforce.gov", contactPhone: "555-0101" },
    { code: "PARTNER003", name: "Bright Futures Salon Network", type: "salon", contactName: "Lisa Rodriguez", contactEmail: "lisa@brightfutures.com", contactPhone: "555-0102" },
    { code: "PARTNER004", name: "Community Housing Partners", type: "community-org", contactName: "James Okonkwo", contactEmail: "james@chp.org", contactPhone: "555-0103" },
    { code: "PARTNER005", name: "Women in Transition Foundation", type: "nonprofit", contactName: "Sarah Mitchell", contactEmail: "sarah@witf.org", contactPhone: "555-0104" },
  ];
  for (const p of partners) {
    await db.partner.upsert({
      where: { code: p.code },
      create: p,
      update: p,
    });
    console.log(`  ✓ ${p.code} — ${p.name}`);
  }

  console.log("\n→ Seeding support staff...");
  const staff = [
    { name: "Tanya Brooks", email: "tanya.brooks@leashed.io", role: "case-manager", specialties: '["reentry","housing","barriers"]' },
    { name: "Marcus Reed", email: "marcus.reed@leashed.io", role: "case-manager", specialties: '["workforce","single-parent"]' },
    { name: "Dr. Amara Okafor", email: "amara.okafor@leashed.io", role: "academic-advisor", specialties: '["curriculum","learning-plans","accommodations"]' },
    { name: "Jordan Hayes", email: "jordan.hayes@leashed.io", role: "academic-advisor", specialties: '["pet-grooming","technology","career-mapping"]' },
    { name: "Elena Vasquez", email: "elena.vasquez@leashed.io", role: "mentor", specialties: '["reentry","life-skills","resilience"]' },
    { name: "Robert Kim", email: "robert.kim@leashed.io", role: "mentor", specialties: '["business","leadership","career-transition"]' },
    { name: "Aisha Patel", email: "aisha.patel@leashed.io", role: "mentor", specialties: '["single-parent","financial-literacy","pet-grooming"]' },
  ];
  for (const s of staff) {
    await db.supportStaff.upsert({
      where: { email: s.email },
      create: s,
      update: s,
    });
    console.log(`  ✓ ${s.role} — ${s.name}`);
  }

  const partnerCount = await db.partner.count();
  const staffCount = await db.supportStaff.count();
  console.log(`\n✓ Done. ${partnerCount} partners, ${staffCount} support staff.`);
}

main().catch(console.error).finally(() => db.$disconnect());
