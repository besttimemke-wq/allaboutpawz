/**
 * Deep content generation runner — fills every class with real domain content.
 *
 * Runs N classes in parallel (default 6) to maximize throughput.
 * Skips classes that already have rich content (>500 words) so it's resumable.
 * Writes progress to stdout + a progress file so we can monitor across pathways.
 *
 * Usage:
 *   bun run scripts/generate-all-content.ts [pathwayCode] [parallelism]
 *   bun run scripts/generate-all-content.ts LSH 6      # one pathway
 *   bun run scripts/generate-all-content.ts ALL 6      # all 10 pathways
 */
import { db } from "../src/lib/db";
import type { Pathway } from "../src/lib/framework/types";

const API = "http://localhost:3000/api/ai/generate-class";
const PARALLEL = parseInt(process.argv[3] || "6", 10);
const TARGET = process.argv[2] || "ALL";

interface Job {
  courseCode: string;
  moduleCode: string;
  classId: string;
  wordCount: number;
}

async function collectJobs(code: string): Promise<Job[]> {
  const courseRow = await db.course.findUnique({ where: { code } });
  if (!courseRow) { console.error(`Course ${code} not found`); return []; }
  let pathway: Pathway;
  try { pathway = JSON.parse(courseRow.data) as Pathway; } catch { return []; }
  const jobs: Job[] = [];
  for (const lvl of pathway.levels) {
    for (const mod of lvl.modules) {
      for (const sm of mod.subModules) {
        for (const cls of sm.classes) {
          const wc = cls.teachableContent.split(/\s+/).filter(Boolean).length;
          jobs.push({ courseCode: code, moduleCode: mod.code, classId: cls.id, wordCount: wc });
        }
      }
    }
  }
  return jobs;
}

async function generateOne(job: Job): Promise<{ job: Job; ok: boolean; wordCount: number; error?: string }> {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    if (res.status === 429) {
      // Rate limited — single retry after 20s
      await new Promise((r) => setTimeout(r, 20000));
      const res2 = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      if (!res2.ok) return { job, ok: false, wordCount: 0, error: `429 after retry` };
      const data2 = await res2.json();
      return { job, ok: true, wordCount: data2.wordCount ?? 0 };
    }
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return { job, ok: false, wordCount: 0, error: `${res.status}: ${err.slice(0, 80)}` };
    }
    const data = await res.json();
    return { job, ok: true, wordCount: data.wordCount ?? 0 };
  } catch (e) {
    return { job, ok: false, wordCount: 0, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function runBatch(jobs: Job[], label: string): Promise<{ done: number; failed: number; skipped: number }> {
  // Skip classes that already have rich content (>500 words)
  const todo = jobs.filter((j) => j.wordCount < 500);
  const skipped = jobs.length - todo.length;
  console.log(`[${label}] ${jobs.length} classes — ${todo.length} to generate, ${skipped} already rich (skipped)`);

  let done = 0;
  let failed = 0;
  const startTime = Date.now();

  // Process sequentially with staggered dispatch to avoid rate-limit collisions.
  // A pool of PARALLEL workers, each pulling from a shared queue.
  let nextIdx = 0;
  async function worker(workerId: number) {
    while (nextIdx < todo.length) {
      const myIdx = nextIdx++;
      const job = todo[myIdx];
      // Stagger: each worker waits (workerId * 3s) before first dispatch
      if (myIdx === 0) await new Promise((r) => setTimeout(r, workerId * 3000));
      const r = await generateOne(job);
      if (r.ok) {
        done++;
        const pct = Math.round(((done + failed) / todo.length) * 100);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`[${label}] ✓ ${done + failed}/${todo.length} (${pct}%) — done:${done} fail:${failed} — ${job.classId} (${r.wordCount}w) — ${elapsed}s`);
      } else {
        failed++;
        console.error(`  ✗ [w${workerId}] ${r.job.courseCode}/${r.job.moduleCode}/${r.job.classId}: ${r.error}`);
      }
      // Small pause between calls per worker to ease rate pressure
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  await Promise.all(Array.from({ length: PARALLEL }, (_, i) => worker(i)));
  console.log(`[${label}] COMPLETE — done:${done} failed:${failed} skipped:${skipped}`);
  return { done, failed, skipped };
}

async function main() {
  const codes = TARGET === "ALL"
    ? ["LSH", "GRM", "TEC", "BUS", "PAR", "PER", "MKT", "FIN", "LDR", "LEG"]
    : [TARGET.toUpperCase()];

  console.log(`=== Deep content generation ===`);
  console.log(`Target: ${codes.join(", ")}`);
  console.log(`Parallelism: ${PARALLEL}`);
  console.log(`Skip threshold: 500 words (classes with >500 words are skipped)\n`);

  let totalDone = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  for (const code of codes) {
    const jobs = await collectJobs(code);
    if (!jobs.length) { console.log(`\n[${code}] no classes found, skipping`); continue; }
    console.log(`\n=== ${code} ===`);
    const res = await runBatch(jobs, code);
    totalDone += res.done;
    totalFailed += res.failed;
    totalSkipped += res.skipped;
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Generated: ${totalDone} classes`);
  console.log(`Failed: ${totalFailed} classes`);
  console.log(`Skipped (already rich): ${totalSkipped} classes`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
