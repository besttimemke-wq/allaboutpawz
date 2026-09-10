"use client";
import { useAppStore, type View } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GraduationCap, Home, LayoutGrid, BookOpen, ShieldCheck } from "lucide-react";

const NAV: { view: View; label: string; icon: typeof Home }[] = [
  { view: "home", label: "Home", icon: Home },
  { view: "catalog", label: "Pathways", icon: LayoutGrid },
  { view: "learner", label: "Learn", icon: BookOpen },
  { view: "admin", label: "Builder", icon: ShieldCheck },
];

export function Header() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const learnerName = useAppStore((s) => s.learnerName);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col justify-between bg-[#0b1928] text-slate-300 select-none">
      <div className="flex flex-col">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/60 px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0284c7] text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Leashed.io</span>
        </div>

        {/* Nav */}
        <nav className="space-y-1 p-3 text-sm font-medium">
          {NAV.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  active
                    ? "bg-[#0284c7] text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User footer */}
      <div className="border-t border-slate-800/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
            {(learnerName || "L")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{learnerName || "Learner"}</p>
            <p className="truncate text-xs text-slate-400">{learnerName ? "Learner" : "Not enrolled"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
