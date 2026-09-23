import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "./enterprise";

// ============================================================================
// Shared CRM route handlers — one pattern, many tables. Each route file
// provides a config object (table name, search columns, JOINs, column map,
// CHECK-validated fields) and this module handles the gate/withPg/SQL/audit.
// ============================================================================

export interface CrmListConfig {
  table: string;              // e.g. "crm_customers"
  alias?: string;             // e.g. "c" (default: first letter of table)
  select?: string;            // custom SELECT (default: "t.*")
  joins?: string;             // JOIN clauses
  searchColumns?: string[];   // columns for ILIKE search
  filterColumns?: string[];   // columns for exact-match filters
  orderBy?: string;           // ORDER BY clause (default: "t.created_at DESC")
  toUi?: (row: any) => any;   // column mapper
  extraWhere?: string;        // extra WHERE conditions
}

export async function handleCrmList(req: NextRequest, config: CrmListConfig) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "200", 10) || 200, 1), 500);
  const alias = config.alias || config.table[4]; // crm_customers → "c"
  const select = config.select || `${alias}.*`;
  const orderBy = config.orderBy || `${alias}.created_at DESC`;

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const where: string[] = [`${alias}.tenant_id = $1`];
    const params: any[] = [tenant];
    let pi = 2;

    if (config.extraWhere) where.push(config.extraWhere);

    if (search && config.searchColumns?.length) {
      const cols = config.searchColumns.map(col => `${col} ILIKE $${pi}`).join(" OR ");
      where.push(`(${cols})`);
      params.push(`%${search}%`);
      pi++;
    }

    if (config.filterColumns) {
      for (const col of config.filterColumns) {
        const val = searchParams.get(col) || "";
        if (val) {
          where.push(`${col} = $${pi}`);
          params.push(val);
          pi++;
        }
      }
    }

    const whereSql = where.join(" AND ");
    const joins = config.joins ? ` ${config.joins}` : "";
    const sql = `SELECT ${select} FROM public.${config.table} ${alias}${joins} WHERE ${whereSql} ORDER BY ${orderBy} LIMIT $${pi}`;
    const r = await client.query(sql, [...params, limit]);
    const rows = config.toUi ? r.rows.map(config.toUi) : r.rows;
    return NextResponse.json({ [config.table.replace("crm_", "").replace(/s$/, "s")]: rows, total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => {
      console.error(`[crm/${config.table} GET]`, e);
      return NextResponse.json({ error: e?.message || "Failed to fetch" }, { status: 500 });
    });
}

// ----------------------------------------------------------------------------
// POST handler for find-or-create. config provides:
//   - table, uniqueColumn (e.g. "email"), validate (function for CHECKs)
//   - insertColumns (which body fields map to which table columns)
//   - auditAction, auditType
// ----------------------------------------------------------------------------
export interface CrmCreateConfig {
  table: string;
  uniqueColumn: string;           // e.g. "email" — find-or-create key
  uniqueIgnoreCase?: boolean;     // true = lower() comparison
  requiredFields: string[];       // body fields that must be present
  insertFields: Record<string, string>; // bodyField → tableColumn
  extraInsert?: Record<string, any>;     // static values (e.g. { lifecycle_stage: "new_lead" })
  validate?: (body: any) => string | null; // returns error message or null
  toUi?: (row: any) => any;
  auditAction: string;
  auditType: string;
}

export async function handleCrmCreate(req: NextRequest, config: CrmCreateConfig) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Required field check
  for (const f of config.requiredFields) {
    if (!body[f]) {
      return NextResponse.json({ error: `${f} is required` }, { status: 400 });
    }
  }

  // Custom validation (CHECK constraints)
  if (config.validate) {
    const err = config.validate(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const uniqueVal = String(body[config.requiredFields[0]] || "").trim();
  const tenant = TENANT_ID();

  return withPg(async (client) => {
    // Find existing
    const compareExpr = config.uniqueIgnoreCase ? `lower(${config.uniqueColumn})` : config.uniqueColumn;
    const compareVal = config.uniqueIgnoreCase ? uniqueVal.toLowerCase() : uniqueVal;
    const found = await client.query(
      `SELECT * FROM public.${config.table} WHERE tenant_id = $1 AND ${compareExpr} = $2 LIMIT 1`,
      [tenant, compareVal],
    );
    let row = found.rows[0];
    let created = false;

    if (row) {
      return NextResponse.json(config.toUi ? config.toUi(row) : row, { status: 200 });
    }

    // Create new
    await client.query("BEGIN");
    try {
      const cols = ["tenant_id", ...Object.keys(config.insertFields)];
      const vals: any[] = [tenant, ...Object.values(config.insertFields).map(f => body[f] ?? null)];
      
      // Add extra static values
      if (config.extraInsert) {
        for (const [k, v] of Object.entries(config.extraInsert)) {
          cols.push(k);
          vals.push(v);
        }
      }

      const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
      const ins = await client.query(
        `INSERT INTO public.${config.table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        vals,
      );
      row = ins.rows[0];
      created = true;

      // Audit
      try {
        await client.query("SAVEPOINT audit_sp");
        await platformAudit(client, {
          action: config.auditAction,
          targetType: config.auditType,
          targetId: String(row.id),
          actorRole: "admin",
          metadata: { [config.uniqueColumn]: uniqueVal },
        });
        await client.query("RELEASE SAVEPOINT audit_sp");
      } catch (auditErr) {
        console.warn(`[${config.table} POST] audit failed (non-fatal):`, auditErr instanceof Error ? auditErr.message : auditErr);
        await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {});
      }

      await client.query("COMMIT");
      return NextResponse.json(config.toUi ? config.toUi(row) : row, { status: created ? 201 : 200 });
    } catch (e: any) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(`[${config.table} POST]`, e);
      return NextResponse.json({ error: e?.message || "Failed to create" }, { status: 500 });
    }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => {
      console.error(`[${config.table} POST] outer`, e);
      return NextResponse.json({ error: e?.message || "Failed to create" }, { status: 500 });
    });
}

// Simple GET-by-id handler (for [id] routes)
export async function handleCrmGetById(req: NextRequest, config: { table: string; idParam: string; toUi?: (row: any) => any }) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get(config.idParam);
  if (!id) return NextResponse.json({ error: `${config.idParam} is required` }, { status: 400 });

  return withPg(async (client) => {
    const r = await client.query(
      `SELECT * FROM public.${config.table} WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
      [TENANT_ID(), id],
    );
    if (!r.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(config.toUi ? config.toUi(r.rows[0]) : r.rows[0]);
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
