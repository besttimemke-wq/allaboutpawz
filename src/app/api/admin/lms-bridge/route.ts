import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-bridge
// Returns the platform bridge / conversion surface:
//   - syncLog:       lms.platform_bridge_sync_log (salon ↔ LMS sync history)
//   - commerceQueue: lms.commerce_sync_queue (commerce ↔ LMS pending jobs)
// Each dataset may be empty (0 rows) — that is expected, not an error.
export async function GET() {
  try {
    const syncLog = await pgQuery<{
      id: string;
      sync_type: string;
      sync_status: string;
      records_processed: number | null;
      records_succeeded: number | null;
      records_failed: number | null;
      started_by: string | null;
      started_at: string | null;
      completed_at: string | null;
    }>(
      `SELECT
         s.id,
         s.sync_type,
         s.sync_status,
         s.records_processed,
         s.records_succeeded,
         s.records_failed,
         s.started_by::text AS started_by,
         s.started_at,
         s.completed_at
       FROM lms.platform_bridge_sync_log s
       ORDER BY s.started_at DESC NULLS LAST
       LIMIT 200`,
    );

    const commerceQueue = await pgQuery<{
      id: string;
      sync_direction: string;
      entity_type: string;
      entity_id: string | null;
      sync_status: string;
      error_message: string | null;
      processed_at: string | null;
      created_at: string;
    }>(
      `SELECT
         q.id,
         q.sync_direction,
         q.entity_type,
         q.entity_id::text,
         q.sync_status,
         q.error_message,
         q.processed_at,
         q.created_at
       FROM lms.commerce_sync_queue q
       ORDER BY q.created_at DESC
       LIMIT 200`,
    );

    return NextResponse.json({ syncLog, commerceQueue });
  } catch (error) {
    console.error("Platform bridge fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
