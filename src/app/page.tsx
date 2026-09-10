"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Header } from "@/components/app/header";
import { Footer } from "@/components/app/footer";
import { HomeView } from "@/components/app/home-view";
import { CatalogView } from "@/components/app/catalog-view";
import { CourseView } from "@/components/app/course-view";
import { LearnerView } from "@/components/app/learner-view";
import { AdminView } from "@/components/app/admin-view";
import { DashboardView } from "@/components/app/dashboard-view";
import { AccreditationView } from "@/components/app/accreditation-view";
import { LearnerOnboarding } from "@/components/app/learner-onboarding";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const learnerCourse = useAppStore((s) => s.learnerTarget?.courseCode);
  const learnerName = useAppStore((s) => s.learnerName);
  
  const [hasProfile, setHasProfile] = useState(false);

  // When entering the learner view, check if the learner has a profile.
  // If not, show onboarding first.
  useEffect(() => {
    if (view !== "learner" || !learnerName) return;
    let cancelled = false;
    api.getLearnerProfile(learnerName).then((l) => {
      if (!cancelled) setHasProfile(!!l);
    }).catch(() => {
      if (!cancelled) setHasProfile(false);
    });
    return () => { cancelled = true; };
  }, [view, learnerName]);

  const showOnboarding = view === "learner" && !!learnerName && !hasProfile;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {showOnboarding ? (
          <LearnerOnboarding
            onComplete={() => {
              setHasProfile(true);
            }}
          />
        ) : (
          <>
            {view === "home" && <HomeView />}
            {view === "catalog" && <CatalogView />}
            {view === "course" && <CourseView />}
            {view === "learner" && <LearnerView key={learnerCourse ?? "none"} />}
            {view === "admin" && <AdminView />}
            {view === "dashboard" && <DashboardView />}
            {view === "accreditation" && <AccreditationView />}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
