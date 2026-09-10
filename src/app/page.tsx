"use client";

import { useAppStore } from "@/lib/store";
import { Header } from "@/components/app/header";
import { Footer } from "@/components/app/footer";
import { HomeView } from "@/components/app/home-view";
import { CatalogView } from "@/components/app/catalog-view";
import { CourseView } from "@/components/app/course-view";
import { LearnerView } from "@/components/app/learner-view";
import { AdminView } from "@/components/app/admin-view";
import { DashboardView } from "@/components/app/dashboard-view";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const learnerCourse = useAppStore((s) => s.learnerTarget?.courseCode);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {view === "home" && <HomeView />}
        {view === "catalog" && <CatalogView />}
        {view === "course" && <CourseView />}
        {view === "learner" && <LearnerView key={learnerCourse ?? "none"} />}
        {view === "admin" && <AdminView />}
        {view === "dashboard" && <DashboardView />}
      </main>
      <Footer />
    </div>
  );
}
