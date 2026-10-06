// Seed the RAG knowledge store with the 6 Leashed pathway companions.
// Run via: bun run scripts/seed-rag-curriculum.ts

import { allPathwayCompanions } from "../src/lib/curriculum";
import { prisma } from "../src/lib/prisma";

const OWNER_ID = "demo-avery";

async function main() {
  // Clear existing demo chunks first
  await prisma.knowledgeChunk.deleteMany({ where: { ownerId: OWNER_ID } });

  const companions = allPathwayCompanions();
  let ingested = 0;

  for (const { seed, companion } of companions) {
    // Each section
    for (let i = 0; i < companion.sections.length; i++) {
      const section = companion.sections[i];
      await prisma.knowledgeChunk.create({
        data: {
          ownerId: OWNER_ID,
          sourceId: `MAN-${seed.code}-S${i + 1}`,
          pathwayCode: seed.code,
          moduleCode: `${seed.code}-${(i + 1) * 100}`,
          text: `Section: ${section.title}\n\nLesson: ${section.lesson}\n\nWorked Example: ${section.workedExample}\n\nChecks: ${section.checks.join(" | ")}`,
          safetyFlag: false,
        },
      });
      ingested++;
    }

    // Overview
    await prisma.knowledgeChunk.create({
      data: {
        ownerId: OWNER_ID,
        sourceId: `MAN-${seed.code}-OVERVIEW`,
        pathwayCode: seed.code,
        moduleCode: `${seed.code}-000`,
        text: `Pathway: ${companion.title}\nCredential: ${seed.credential}\nHours: ${seed.hours}\nWeeks: ${seed.weeks}\n\nOverview: ${companion.overview}\n\nObjectives: ${companion.learningObjectives.join(" | ")}`,
        safetyFlag: false,
      },
    });
    ingested++;

    // Glossary
    await prisma.knowledgeChunk.create({
      data: {
        ownerId: OWNER_ID,
        sourceId: `MAN-${seed.code}-GLOSSARY`,
        pathwayCode: seed.code,
        moduleCode: `${seed.code}-GLOSS`,
        text: `Glossary for ${companion.title}: ${companion.glossary.map((g) => `${g.term}: ${g.definition}`).join(" | ")}`,
        safetyFlag: false,
      },
    });
    ingested++;

    // Safety gates
    const safetyGates: Record<string, string[]> = {
      IPDG: ["IPDG-103", "IPDG-302", "IPDG-402"],
      PDT: ["PDT-201", "PDT-402"],
      ACA: ["ACA-201"],
      PPS: ["PPS-104", "PPS-105"],
      CAT: ["CAT-102"],
      PPC: ["PPC-105", "PPC-201", "PPC-306", "PPC-403", "PPC-405", "PPC-410"],
    };

    for (const gateCode of safetyGates[seed.code] || []) {
      await prisma.knowledgeChunk.create({
        data: {
          ownerId: OWNER_ID,
          sourceId: `SAFETY-${gateCode}`,
          pathwayCode: seed.code,
          moduleCode: gateCode,
          text: `SAFETY GATE: ${gateCode} in ${companion.title}. This module must be signed off by an instructor before live-animal work begins. Safety gates are pass/fail — competency must be demonstrated, not just attempted.`,
          safetyFlag: true,
        },
      });
      ingested++;
    }
  }

  console.log(`Ingested ${ingested} curriculum chunks into the RAG knowledge store.`);
  const total = await prisma.knowledgeChunk.count({ where: { ownerId: OWNER_ID } });
  console.log(`Total chunks in store: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
