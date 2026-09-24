// Standalone schema verification — prints the columns of every LMS table we
// are about to wire db.ts against. Run with: bun scripts/verify-lms-schema.ts
import "dotenv/config";

const CONN = process.env.SUPABASE_SESSION_POOLER || process.env.DATABASE_URL || "";
if (!CONN) {
  console.error("Missing SUPABASE_SESSION_POOLER / DATABASE_URL");
  process.exit(1);
}

const { Client } = await import("pg");
const client = new Client({ connectionString: CONN, connectionTimeoutMillis: 10000 });
await client.connect();

const TABLES = [
  "ai_rag_chunks",
  "learner_notes",
  "learning_analytics_events",
  "file_uploads",
  "conversation_messages",
  "artifact_submissions",
  "assignments",
  "quiz_attempts",
  "meeting_records",
  "pacing_schedules",
  "grade_book",
  "enrollments",
  "courses",
  "ai_tutor_messages",
  "ai_teaching_sessions",
  "ai_escalation_queue",
];

for (const t of TABLES) {
  const { rows } = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'lms' AND table_name = $1
     ORDER BY ordinal_position`,
    [t],
  );
  console.log(`\n=== lms.${t} (${rows.length} cols) ===`);
  for (const r of rows) {
    console.log(`  ${r.column_name.padEnd(32)} ${r.data_type.padEnd(20)} ${r.is_nullable === "YES" ? "NULL" : "NOT NULL"}`);
  }
}

// Also print row counts for the tables that should have data.
console.log("\n=== Row counts ===");
for (const t of ["courses", "enrollments", "ai_rag_chunks", "ai_tutor_messages", "ai_teaching_sessions", "assignments", "quiz_attempts", "learner_notes"]) {
  try {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM lms.${t}`);
    console.log(`  lms.${t.padEnd(28)} ${rows[0].n} rows`);
  } catch (e) {
    console.log(`  lms.${t.padEnd(28)} ERR: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Show one sample row from lms.ai_rag_chunks (we know it has data)
try {
  const { rows } = await client.query(`SELECT * FROM lms.ai_rag_chunks LIMIT 1`);
  console.log("\n=== lms.ai_rag_chunks SAMPLE ===");
  console.log(JSON.stringify(rows[0], null, 2).slice(0, 1500));
} catch (e) {
  console.log("sample ai_rag_chunks err:", e instanceof Error ? e.message : String(e));
}

// Show one sample from enrollments
try {
  const { rows } = await client.query(`SELECT * FROM lms.enrollments LIMIT 1`);
  console.log("\n=== lms.enrollments SAMPLE ===");
  console.log(JSON.stringify(rows[0], null, 2).slice(0, 1500));
} catch (e) {
  console.log("sample enrollments err:", e instanceof Error ? e.message : String(e));
}

await client.end();
