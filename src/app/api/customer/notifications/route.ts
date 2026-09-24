import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, sessionFromPayload } from "@/lib/pawz-auth";
import { listUserNotifications, sendUserNotification } from "@/lib/notifications";

// GET  /api/customer/notifications — the customer's messages (Supabase
//        user_notifications: cancellation notices, system events, chat).
// POST /api/customer/notifications { message } — the customer sends a
//        message to the salon (simple messaging, both directions).
async function sessionUser() {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (payload) return sessionFromPayload(payload);
  return null;
}

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const notifications = await listUserNotifications(user.authUserId, 100);
    return NextResponse.json({ notifications });
  } catch (e: any) {
    console.error("[GET /api/customer/notifications]", e);
    return NextResponse.json({ error: e.message || "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await sessionUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { message } = await req.json();
    const text = String(message || "").trim().slice(0, 2000);
    if (!text) return NextResponse.json({ error: "Message is required." }, { status: 400 });

    const ok = await sendUserNotification({
      userId: user.authUserId,
      notificationType: "message",
      title: text.length > 80 ? text.slice(0, 77) + "…" : text,
      body: text,
      metadata: { from: "customer" },
    });
    if (!ok) return NextResponse.json({ error: "Message could not be delivered." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[POST /api/customer/notifications]", e);
    return NextResponse.json({ error: e.message || "Failed to send message" }, { status: 500 });
  }
}
