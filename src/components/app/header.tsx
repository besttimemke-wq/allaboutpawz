"use client";
import Link from "next/link";
import { useAppStore, type View } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Home, LayoutGrid, BookOpen, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { view: View; label: string; icon: typeof Home }[] = [
  { view: "home", label: "Pathway", icon: Home },
  { view: "catalog", label: "Catalog", icon: LayoutGrid },
  { view: "learner", label: "Learn", icon: BookOpen },
  { view: "admin", label: "Builder", icon: ShieldCheck },
];

export function Header() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" onClick={() => setView("home")} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-semibold tracking-tight">Leashed.io</span>
            <span className="text-[11px] text-muted-foreground">Digital Learning University</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Button
              key={item.view}
              variant={view === item.view ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView(item.view)}
              className={cn("gap-1.5", view === item.view && "text-secondary-foreground")}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
            <Sparkles className="h-3 w-3 text-primary" />
            Leashed Framework v1
          </Badge>
          <Button size="sm" onClick={() => setView("catalog")} className="gap-1.5">
            Enroll
          </Button>
        </div>
      </div>

      {/* mobile nav */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-2 py-1.5 md:hidden scroll-area-custom">
        {NAV.map((item) => (
          <Button
            key={item.view}
            variant={view === item.view ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView(item.view)}
            className="shrink-0 gap-1.5"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </div>
    </header>
  );
}
