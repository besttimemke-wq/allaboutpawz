import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-media
// Lists media_assets from the LMS media library. May be empty (0 rows) — that
// is expected, not an error.
export async function GET() {
  try {
    const rows = await pgQuery<{
      id: string;
      title: string;
      description: string | null;
      media_type: string;
      file_name: string;
      file_extension: string | null;
      mime_type: string | null;
      file_size_bytes: number | null;
      storage_path: string;
      public_url: string | null;
      thumbnail_url: string | null;
      duration_seconds: number | null;
      is_accessible: boolean | null;
      is_published: boolean | null;
      created_at: string;
    }>(
      `SELECT
         m.id,
         m.title,
         m.description,
         m.media_type,
         m.file_name,
         m.file_extension,
         m.mime_type,
         m.file_size_bytes,
         m.storage_path,
         m.public_url,
         m.thumbnail_url,
         m.duration_seconds,
         m.is_accessible,
         m.is_published,
         m.created_at
       FROM lms.media_assets m
       ORDER BY m.created_at DESC
       LIMIT 200`,
    );

    return NextResponse.json({ media: rows });
  } catch (error) {
    console.error("Media assets fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
