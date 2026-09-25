import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-compliance
// Returns the compliance surface:
//   - documents: lms.compliance_documents (licenses, certifications, audits)
//   - auditLog:   lms.platform_audit_log (immutable audit trail)
// Each dataset may be empty (0 rows) — that is expected, not an error.
export async function GET() {
  try {
    const documents = await pgQuery<{
      id: string;
      document_type: string;
      document_name: string;
      document_url: string;
      issued_by: string | null;
      issued_date: string | null;
      expiry_date: string | null;
      status: string;
      created_at: string;
    }>(
      `SELECT
         d.id,
         d.document_type,
         d.document_name,
         d.document_url,
         d.issued_by,
         d.issued_date::text,
         d.expiry_date::text,
         d.status,
         d.created_at
       FROM lms.compliance_documents d
       ORDER BY d.created_at DESC
       LIMIT 200`,
    );

    const auditLog = await pgQuery<{
      id: string;
      actor_user_id: string | null;
      actor_role: string | null;
      action: string;
      target_entity_type: string;
      target_entity_id: string | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: string;
    }>(
      `SELECT
         a.id,
         a.actor_user_id,
         a.actor_role,
         a.action,
         a.target_entity_type,
         a.target_entity_id::text,
         a.ip_address,
         a.user_agent,
         a.created_at
       FROM lms.platform_audit_log a
       ORDER BY a.created_at DESC
       LIMIT 200`,
    );

    return NextResponse.json({ documents, auditLog });
  } catch (error) {
    console.error("Compliance fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
