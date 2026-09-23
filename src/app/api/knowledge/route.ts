import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { ingestChunk, listChunks, deleteChunk, countChunks } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/knowledge?pathwayCode=... — list knowledge chunks for the demo
// owner (optional pathway filter). Includes a total count for the dashboard.
export async function GET(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const pathwayCode = request.nextUrl.searchParams.get("pathwayCode") || undefined;
    const [chunks, total] = await Promise.all([
      listChunks(visitor.id, pathwayCode || undefined),
      countChunks(visitor.id),
    ]);
    return NextResponse.json({ chunks, total });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load knowledge chunks." },
      { status: 500 },
    );
  }
}

// POST /api/knowledge — ingest one chunk.
// Body: { sourceId, pathwayCode, moduleCode, text, safetyFlag }
// The sourceId is namespaced with the ownerId so multi-tenant source names
// never collide inside the shared table.
export async function POST(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const body = (await request.json().catch(() => null)) as {
      sourceId?: string;
      pathwayCode?: string;
      moduleCode?: string;
      text?: string;
      safetyFlag?: boolean;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
    }
    const sourceId = String(body.sourceId || "").trim().slice(0, 200);
    const pathwayCode = String(body.pathwayCode || "").trim().slice(0, 80);
    const moduleCode = String(body.moduleCode || "").trim().slice(0, 80);
    const text = String(body.text || "").trim().slice(0, 8000);
    if (!sourceId || !pathwayCode || !moduleCode || !text) {
      return NextResponse.json(
        { error: "sourceId, pathwayCode, moduleCode, and text are required." },
        { status: 400 },
      );
    }
    const chunk = await ingestChunk(visitor.id, {
      // Namespace the source with the ownerId so different owners can reuse
      // source names without colliding inside the shared table.
      sourceId: `${visitor.id}:${sourceId}`,
      pathwayCode,
      moduleCode,
      text,
      safetyFlag: Boolean(body.safetyFlag),
    });
    return NextResponse.json({ chunk });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to ingest chunk." },
      { status: 500 },
    );
  }
}

// DELETE /api/knowledge?id=... — delete a single chunk by id.
export async function DELETE(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const id = request.nextUrl.searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ error: "Chunk id is required." }, { status: 400 });
    }
    await deleteChunk(visitor.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete chunk." },
      { status: 500 },
    );
  }
}
