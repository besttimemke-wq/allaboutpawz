import pg from "pg"

// ---------------------------------------------------------------------------
// Simple messaging on the owner's Supabase table: user_notifications
// (user_id, notification_type, title, body, priority, is_read, action_url,
// metadata jsonb). The customer portal Messages page renders these as the
// chat timeline; cancellations and other system events land here.
// ---------------------------------------------------------------------------

const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

export type UserNotificationRow = {
  id: string
  notification_type: string
  title: string
  body: string | null
  is_read: boolean
  action_url: string | null
  metadata: Record<string, any>
  created_at: string
}

export async function sendUserNotification(opts: {
  userId: string
  notificationType: string
  title: string
  body?: string
  actionUrl?: string
  metadata?: Record<string, any>
}): Promise<boolean> {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) return false
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(
      `INSERT INTO public.user_notifications
         (tenant_id, user_id, notification_type, title, body, action_url, metadata)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::jsonb)`,
      [
        TENANT_ID,
        opts.userId,
        opts.notificationType,
        opts.title,
        opts.body || null,
        opts.actionUrl || null,
        JSON.stringify(opts.metadata || {}),
      ],
    )
    return true
  } catch (e: any) {
    console.error("[sendUserNotification]", e.message)
    return false
  } finally {
    await client.end().catch(() => {})
  }
}

export async function listUserNotifications(userId: string, limit = 100): Promise<UserNotificationRow[]> {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) return []
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const res = await client.query(
      `SELECT id::text, notification_type, title, body, is_read, action_url, metadata, created_at::text
       FROM public.user_notifications
       WHERE tenant_id = $1 AND user_id = $2::uuid
       ORDER BY created_at DESC
       LIMIT $3;`,
      [TENANT_ID, userId, limit],
    )
    return res.rows.map((r: any) => ({
      id: r.id,
      notification_type: r.notification_type,
      title: r.title,
      body: r.body,
      is_read: r.is_read,
      action_url: r.action_url,
      metadata: (typeof r.metadata === "string" ? JSON.parse(r.metadata || "{}") : r.metadata) || {},
      created_at: r.created_at,
    }))
  } finally {
    await client.end().catch(() => {})
  }
}
