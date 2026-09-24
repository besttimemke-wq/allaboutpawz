import { redirect } from "next/navigation";

// /admin/login — the old site-era admin sign-in route. The bifurcated auth
// system uses /admin-login; keep this path working for existing bookmarks.
export default function AdminLoginPage() {
  redirect("/admin-login");
}
