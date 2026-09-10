"use client";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold tracking-tight">Leashed.io</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Every course is taught live by LeashGuide AI — not recorded lectures, not static text.
              Learn through the 5-part flow (Connect → Learn → See It → Do It → Check) and earn a free
              certificate. 4 levels, 20 modules, 120 hours, one uniform framework.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Built on</span>
            <div className="flex flex-wrap gap-1.5">
              {["Z.ai Live AI", "Leashed Framework v1", "SCORM 1.2"].map((b) => (
                <span key={b} className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Leashed.io — Leashed Learning Framework v1.0. Live AI by Z.ai. Free certificates for all learners.
        </div>
      </div>
    </footer>
  );
}
