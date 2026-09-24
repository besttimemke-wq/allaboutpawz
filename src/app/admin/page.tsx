import { redirect } from "next/navigation";

// /admin — the admin OS is route-based now. Send visitors to the dashboard;
// its layout handles the auth gate (unauthenticated → /admin-login).
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
