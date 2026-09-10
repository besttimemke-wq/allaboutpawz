"use client";
import { useMemo, useState } from "react";
import {
  getBodySummaries,
  ALL_REQUIREMENTS,
  STATUS_META,
  type BodyKey,
  type StandardRequirement,
} from "@/lib/accreditation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  ExternalLink,
  Info,
  Scale,
  Building2,
  Cpu,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BODY_META: Record<BodyKey, { icon: typeof Scale; typeLabel: string; typeColor: string }> = {
  IACET: { icon: Scale, typeLabel: "CEU-granting authority", typeColor: "text-primary" },
  COE: { icon: Building2, typeLabel: "Institutional accreditation", typeColor: "text-amber-600 dark:text-amber-400" },
  ACCSC: { icon: Building2, typeLabel: "Institutional accreditation", typeColor: "text-amber-600 dark:text-amber-400" },
  SCORM: { icon: Cpu, typeLabel: "Technical packaging standard", typeColor: "text-muted-foreground" },
};

export function AccreditationView() {
  const summaries = useMemo(() => getBodySummaries(), []);
  const [activeBody, setActiveBody] = useState<BodyKey>("IACET");

  const activeReqs = ALL_REQUIREMENTS.filter((r) => r.body === activeBody);
  const overallReady = summaries.reduce((s, b) => s + b.ready, 0);
  const overallTotal = ALL_REQUIREMENTS.filter((r) => r.status !== "n/a").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accreditation readiness</h1>
          <p className="text-sm text-muted-foreground">
            An honest map of where our evidence stands against real accreditation standards.
          </p>
        </div>
      </div>

      {/* Critical honesty banner */}
      <Card className="mt-6 border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/10">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              We are NOT accredited. Nothing on this platform issues accredited credentials yet.
            </p>
            <p className="mt-1 text-amber-800/90 dark:text-amber-300/80">
              Certificates currently say &ldquo;Certificate of Completion&rdquo; and CEUs are labeled
              &ldquo;IACET authorization pending.&rdquo; IACET CEUs can only be legally issued once we are
              an IACET Authorized Provider. Institutional accreditors (COE, ACCSC) require years of
              operating history and a site visit. This dashboard tracks our real progress toward each.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Overall + body summary cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaries.map((b) => {
          const meta = BODY_META[b.body];
          const BIcon = meta.icon;
          const isActive = activeBody === b.body;
          return (
            <button
              key={b.body}
              onClick={() => setActiveBody(b.body)}
              className={cn(
                "text-left transition",
                isActive ? "scale-[1.02]" : "hover:scale-[1.01]",
              )}
            >
              <Card className={cn("h-full transition", isActive ? "border-primary ring-2 ring-primary/20" : "hover:shadow-md")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className={cn("grid h-8 w-8 place-items-center rounded-lg bg-muted", meta.typeColor)}>
                      <BIcon className="h-4 w-4" />
                    </span>
                    <Badge
                      variant={b.authorizationStatus === "authorized" ? "default" : "outline"}
                      className={cn("text-[10px] capitalize", b.authorizationStatus === "not-applied" && "border-muted-foreground/40 text-muted-foreground")}
                    >
                      {b.authorizationStatus.replace("-", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-tight">{b.body}</p>
                  <p className="text-[10px] text-muted-foreground">{meta.typeLabel}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold tabular-nums">{b.pct}%</span>
                    <span className="text-[10px] text-muted-foreground">{b.ready}/{b.total} ready</span>
                  </div>
                  <Progress value={b.pct} className="mt-1.5 h-1.5" />
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Active body detail */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {summaries.find((s) => s.body === activeBody)?.name}
            </CardTitle>
            {(() => {
              const s = summaries.find((x) => x.body === activeBody)!;
              return (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {s.ready} ready</span>
                  <span className="inline-flex items-center gap-1"><CircleDot className="h-3.5 w-3.5 text-amber-500" /> {s.inProgress} in progress</span>
                  <span className="inline-flex items-center gap-1"><CircleDashed className="h-3.5 w-3.5 text-muted-foreground/50" /> {s.notStarted} not started</span>
                </div>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const s = summaries.find((x) => x.body === activeBody)!;
            return (
              <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
                <p><span className="font-semibold">Becoming authorized would enable:</span> {s.enables}</p>
                <p className="mt-1"><span className="font-semibold">Honest status:</span> {s.honestLabel}</p>
              </div>
            );
          })()}

          <div className="space-y-2">
            {activeReqs.map((r) => (
              <RequirementRow key={r.id} req={r} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* "World's first AI university" path note */}
      <Card className="mt-6 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-4 w-4 text-primary" /> The legitimate path to an AI-native accredited institution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            There is no legal shortcut — &ldquo;accredited&rdquo; is a protected term. But there is a real,
            achievable sequence:
          </p>
          <ol className="ml-5 list-decimal space-y-2">
            <li>
              <span className="font-medium text-foreground">Build to ANSI/IACET 1-2018 now.</span> Every requirement
              above marked &ldquo;ready&rdquo; is real evidence for our IACET Authorized Provider application.
              Categories 5 (objectives), 6 (instructional design), 7 (assessment), 9 (records) are already in the
              platform. Close categories 1, 2, 4, 8, 11 to apply.
            </li>
            <li>
              <span className="font-medium text-foreground">Apply for IACET Authorized Provider status</span> (~$2,500–5,000/yr
              + application review). Once authorized, certificates can legally say &ldquo;IACET CEU.&rdquo;
            </li>
            <li>
              <span className="font-medium text-foreground">Ship SCORM packages</span> so courses run inside any existing
              accredited institution&rsquo;s LMS — a fast route to reach learners before our own institutional accreditation.
            </li>
            <li>
              <span className="font-medium text-foreground">Pursue COE or ACCSC institutional accreditation</span> after
              2–3 years of operating history, audited financials, and a site visit. That is when &ldquo;University&rdquo;
              becomes defensible as a name. Until then, &ldquo;Academy&rdquo; (as in your catalog&rsquo;s
              &ldquo;Career-to-Ownership Academy&rdquo;) is the safer term.
            </li>
            <li>
              <span className="font-medium text-foreground">AI-instructor governance</span> — document what LeashGuide may
              and may not do (it coaches, never grades artifacts autonomously; human-in-the-loop for credentialing
              decisions). This is required by IACET Cat. 2 & 11 and is the honest answer to &ldquo;the AI instructor.&rdquo;
            </li>
          </ol>
          <p className="rounded-lg bg-primary/5 p-3 text-xs">
            <span className="font-medium">Bottom line:</span> the platform&rsquo;s framework structure IS the accreditation
            evidence. The gap is process (applications, operating history, audits), not product. This dashboard turns
            aspirational badges into an actionable checklist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RequirementRow({ req }: { req: StandardRequirement }) {
  const meta = STATUS_META[req.status];
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-start gap-3">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", meta.dot)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{req.category}</Badge>
            {req.required ? (
              <Badge variant="secondary" className="text-[9px]">Required</Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] text-muted-foreground">Recommended</Badge>
            )}
            <span className={cn("ml-auto text-[11px] font-medium", meta.color)}>{meta.label}</span>
          </div>
          <p className="mt-1.5 text-sm">{req.requirement}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Evidence needed:</span> {req.evidenceNeeded}
          </p>
          {req.evidenceLocation && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-primary">
              <ExternalLink className="h-3 w-3" /> {req.evidenceLocation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
