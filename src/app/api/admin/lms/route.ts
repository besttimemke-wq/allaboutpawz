// ============================================================================
// LMS Admin Data Bridge — generic endpoint for the lms-dashboard tabs.
//
// Architecture: Component (DomainTabShell) ↔ Fetch Hook ↔ this API Route
//               ↔ pgQuery ↔ lms.* Schema
//
// Every tab in the lms-dashboard passes its target tables via the `tables`
// query param. This route validates each table name against
// information_schema (SQL-injection safe), queries it via pgQuery, and
// returns all rows grouped by table.
//
// GET /api/admin/lms?tables=lms.pathways,lms.pathway_courses
//   → { "lms.pathways": [...], "lms.pathway_courses": [...] }
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache of whitelisted lms.* table names — validated on first request.
let _whitelist: Set<string> | null = null;

async function getWhitelist(): Promise<Set<string>> {
  if (_whitelist) return _whitelist;
  const rows = await pgQuery<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'lms' AND table_type = 'BASE TABLE'`,
  );
  _whitelist = new Set(rows.map((r) => `lms.${r.table_name}`));
  return _whitelist;
}

// Column metadata cache — so we know which columns exist per table.
const _columnCache = new Map<string, string[]>();

async function getColumns(fullyQualified: string): Promise<string[]> {
  if (_columnCache.has(fullyQualified)) return _columnCache.get(fullyQualified)!;
  const [schema, table] = fullyQualified.split(".");
  const rows = await pgQuery<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table],
  );
  const cols = rows.map((r) => r.column_name);
  _columnCache.set(fullyQualified, cols);
  return cols;
}

export async function GET(request: NextRequest) {
  try {
    const tablesParam = request.nextUrl.searchParams.get("tables") || "";
    if (!tablesParam.trim()) {
      return NextResponse.json(
        { error: "Missing 'tables' query param. Example: ?tables=lms.pathways,lms.enrollments" },
        { status: 400 },
      );
    }

    const requested = tablesParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (requested.length === 0 || requested.length > 5) {
      return NextResponse.json(
        { error: "Provide 1-5 tables." },
        { status: 400 },
      );
    }

    // Validate every table against the lms.* whitelist
    const whitelist = await getWhitelist();
    const valid: string[] = [];
    for (const t of requested) {
      const normalized = t.startsWith("lms.") ? t : `lms.${t}`;
      if (!whitelist.has(normalized)) {
        return NextResponse.json(
          { error: `Table '${t}' is not a valid lms.* table.` },
          { status: 400 },
        );
      }
      valid.push(normalized);
    }

    // Query each table in parallel (pg Pool handles concurrency)
    const entries = await Promise.all(
      valid.map(async (fqtn) => {
        const cols = await getColumns(fqtn);
        // Build a SELECT for the first 12 columns (avoids selecting huge
        // jsonb/text columns that aren't useful in a table view). Always
        // include id if present.
        const displayCols = cols.filter(
          (c) =>
            !c.endsWith("_embedding") &&
            c !== "embedding" &&
            !c.includes("content_snapshot") &&
            !c.includes("ai_grading_metadata"),
        );
        const selectCols = displayCols.slice(0, 12).map((c) => `"${c}"`).join(", ");
        const rows = await pgQuery<Record<string, unknown>>(
          `SELECT ${selectCols} FROM ${fqtn} ORDER BY 1 LIMIT 100`,
        );
        return [fqtn, { columns: displayCols.slice(0, 12), rows }] as const;
      }),
    );

    const result: Record<string, { columns: string[]; rows: Record<string, unknown>[] }> = {};
    for (const [fqtn, data] of entries) {
      result[fqtn] = data;
    }

    return NextResponse.json({ tables: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LMS admin query failed." },
      { status: 500 },
    );
  }
}
