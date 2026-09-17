import { redirect } from "next/navigation";

// /learn/my-learning — the sidebar's home section. The Learning Center
// dashboard IS the my-learning surface; keep this URL working for
// direct hits and bookmarks.
export default function MyLearningPage() {
  redirect("/learn/dashboard");
}
