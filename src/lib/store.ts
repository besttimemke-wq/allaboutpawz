/**
 * Global UI state for the single-page Leashed.io app.
 * Drives view-switching across home / catalog / course / learner / admin,
 * the selected course, and the learner's current target (module + class).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type View = "home" | "catalog" | "course" | "learner" | "admin" | "dashboard" | "accreditation";

export interface LearnerTarget {
  courseCode: string;
  moduleCode?: string;
  classId?: string;
}

interface AppState {
  view: View;
  selectedCourseCode: string | null;
  learnerName: string;
  learnerTarget: LearnerTarget | null;
  setView: (v: View) => void;
  openCourse: (code: string) => void;
  startLearning: (t: LearnerTarget) => void;
  setLearnerName: (n: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "home",
      selectedCourseCode: null,
      learnerName: "",
      learnerTarget: null,
      setView: (v) => set({ view: v }),
      openCourse: (code) => set({ selectedCourseCode: code, view: "course" }),
      startLearning: (t) => set({ learnerTarget: t, selectedCourseCode: t.courseCode, view: "learner" }),
      setLearnerName: (n) => set({ learnerName: n }),
    }),
    { name: "leashed-app", partialize: (s) => ({ learnerName: s.learnerName }) },
  ),
);
