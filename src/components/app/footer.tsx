"use client";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

const ACCREDITATION = ["COE", "ACCSC", "IACET", "ICG", "SCORM"];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold tracking-tight">Leashed.io · Digital Learning University</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Every pathway is built on the Leashed Learning Framework — 4 levels, 20 modules, 180 lesson blocks,
              120 hours, 12 IACET CEUs. Live AI tutoring by LeashGuide.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Accreditation alignment
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ACCREDITATION.map((b) => (
                <Badge key={b} variant="secondary" className="text-[11px]">
                  {b}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Leashed.io — Leashed Learning Framework v1.0. SCORM-packaged. Live AI by Z.ai.
        </div>
      </div>
    </footer>
  );
}
