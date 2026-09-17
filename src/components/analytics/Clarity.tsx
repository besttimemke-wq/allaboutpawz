"use client";

// ---------------------------------------------------------------------------
// All About Pawz — Microsoft Clarity (session recordings + heatmaps).
//
// Clarity RECORDS full visitor sessions, so it is loaded ONLY after the
// visitor grants the "Performance & Analytics" cookie category — recording
// without consent is a GDPR violation. The official Clarity snippet is
// injected once consent is granted, and Clarity's own consent signal
// (`clarity('consent')`) is raised immediately after so recordings are
// marked consented in the Clarity dashboard.
//
// Env: NEXT_PUBLIC_CLARITY_ID (Clarity dashboard → project → Settings).
// While it is empty this component is a no-op — paste the project ID and it
// goes live on the next page load.
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { useAnalyticsConsent } from "@/components/analytics/use-analytics-consent";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export function Clarity() {
  const granted = useAnalyticsConsent();

  useEffect(() => {
    if (!granted || !CLARITY_ID || window.clarity) return;
    try {
      // Microsoft's official install snippet, inlined:
      // https://learn.microsoft.com/en-us/clarity/clarity-setup
      (function (c: Window, l: Document, a: string, r: string, i: string) {
        const existing = c[a] as unknown as { q?: unknown[] } | undefined;
        if (existing && typeof existing === "object") {
          existing.q = existing.q || [];
        } else {
          (c as unknown as Record<string, unknown>)[a] = { q: [] };
        }
        const t = l.createElement(r) as HTMLScriptElement;
        t.async = 1;
        t.src = "https://www.clarity.ms/tag/" + i;
        const y = l.getElementsByTagName(r)[0];
        y.parentNode?.insertBefore(t, y);
      })(window, document, "clarity", "script", CLARITY_ID);
      // Clarity's documented consent signal — recordings are consented.
      window.clarity?.("consent");
    } catch {
      /* never fatal */
    }
  }, [granted]);

  return null;
}
