"use client";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, BadgeCheck, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";

const STANDARDS = ["ANSI/IACET 1-2018", "COE", "ACCSC", "SCORM 1.2"];

export function Footer() {
  const setView = useAppStore((s) => s.setView);
  return (
    <footer className="mt-auto border-t border-border/70 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold tracking-tight">Leashed.io · Career-to-Ownership Academy</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Every pathway is built on the Leashed Learning Framework — 4 levels, 20 modules, 180 lesson blocks,
              120 hours. Live AI tutoring by LeashGuide. SCORM-packaged.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Standards we are building toward
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STANDARDS.map((b) => (
                <Badge key={b} variant="outline" className="text-[11px]">
                  {b}
                </Badge>
              ))}
            </div>
            <button
              onClick={() => setView("accreditation")}
              className="mt-1 inline-flex w-fit items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              <BadgeCheck className="h-3 w-3" /> View accreditation readiness →
            </button>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Leashed.io — Leashed Learning Framework v1.0. SCORM-packaged. Live AI by Z.ai.
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Not an accredited institution. CEUs are informational pending IACET authorization.
          </p>
        </div>
      </div>
    </footer>
  );
}
