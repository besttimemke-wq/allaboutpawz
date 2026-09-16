import { NextRequest, NextResponse } from "next/server";
import pg from "pg";
import { DEFAULT_SETTINGS, SystemSettings } from "@/lib/settings-types";
import { requireAdminApi } from "@/lib/admin/gate";

async function getPgClient() {
  const connectionString = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;
  if (!connectionString) return null;
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

// GET /api/admin/settings - Read all system settings, bootstrapping the database table if needed
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const pgClient = await getPgClient();
    if (!pgClient) {
      // Graceful fallback if database connection string is not set
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    // 1. Ensure public.site_settings table exists (Auto-bootstrapping)
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 2. Fetch current settings from the table
    const result = await pgClient.query("SELECT key, value FROM public.site_settings");
    
    // 3. Construct the settings object
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };
    
    if (result.rows.length === 0) {
      // If table is empty, seed it with the default values
      for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
        await pgClient.query(`
          INSERT INTO public.site_settings (key, value) 
          VALUES ($1, $2)
          ON CONFLICT (key) DO NOTHING
        `, [key, typeof val === "object" ? JSON.stringify(val) : String(val)]);
      }
    } else {
      // Map database rows to the strongly-typed SystemSettings
      for (const row of result.rows) {
        const key = row.key;
        const rawVal = row.value;

        // Try parsing boolean, numbers or objects if applicable
        if (rawVal === "true") {
          settings[key] = true;
        } else if (rawVal === "false") {
          settings[key] = false;
        } else if (!isNaN(Number(rawVal)) && rawVal.trim() !== "") {
          settings[key] = Number(rawVal);
        } else {
          try {
            // Check if it's JSON array or object
            if ((rawVal.startsWith("{") && rawVal.endsWith("}")) || (rawVal.startsWith("[") && rawVal.endsWith("]"))) {
              settings[key] = JSON.parse(rawVal);
            } else {
              settings[key] = rawVal;
            }
          } catch {
            settings[key] = rawVal;
          }
        }
      }
    }

    await pgClient.end();
    return NextResponse.json(settings);
  } catch (err: any) {
    console.error("[GET /api/admin/settings] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

// POST /api/admin/settings - Update or upsert multiple settings keys
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const body = await req.json();
    const pgClient = await getPgClient();

    if (!pgClient) {
      // If no database is available, return the updated request payload to mock saving
      return NextResponse.json({ success: true, message: "Settings simulated saved.", data: body });
    }

    // Ensure table exists
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Ensure audit_logs table exists
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        action TEXT NOT NULL,
        details TEXT NOT NULL
      );
    `);

    const updatedKeys: string[] = [];

    // Dynamic upsert for each provided field in the body
    for (const [key, val] of Object.entries(body)) {
      if (val === undefined) continue;

      const serializedVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      await pgClient.query(`
        INSERT INTO public.site_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value;
      `, [key, serializedVal]);
      updatedKeys.push(key);
    }

    // Insert an audit log entry
    if (updatedKeys.length > 0) {
      await pgClient.query(`
        INSERT INTO public.audit_logs (action, details)
        VALUES ($1, $2)
      `, ['SETTINGS_UPDATE', `Administrator committed changes to keys: [${updatedKeys.join(", ")}]`]);
    }

    await pgClient.end();
    return NextResponse.json({ success: true, message: "System settings saved successfully." });
  } catch (err: any) {
    console.error("[POST /api/admin/settings] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}
