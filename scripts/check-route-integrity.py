#!/usr/bin/env python3
"""Route integrity: every nav item in every portal must resolve to a real
page.tsx. Checks Sidebar variants, ModuleNav, Header pillars + dropdown.
Exits 1 if any nav target 404s."""

import pathlib, re, sys

ROOT = pathlib.Path("/home/z/my-project/src/app")
PAGES = set()
for p in ROOT.rglob("page.tsx"):
    url = str(p.parent.relative_to(ROOT))
    # route groups () and parallel segments: strip (group) parts
    parts = [seg for seg in url.split("/") if not seg.startswith("(")]
    url_path = "/" + "/".join(parts) if parts else "/"
    PAGES.add(url_path)

# also /sitemap.xml route
PAGES.add("/sitemap.xml")

# nav ids per portal prefix (from Sidebar VARIANT_CONFIG + layouts' navigate())
checks = {
    "/admin": ["dashboard","customers","pets","appointments","grooming-records","calendar","services","staff","schedule",
               "orders","order-details","inventory","shipping","returns","purchase-orders",
               "books","invoices","payments","deposits","refunds","gift-cards","payroll","taxes","reports","financial-settings","stripe-connections",
               "settings"],  # settings via Header dropdown
    "/customer": ["dashboard","appointments","pets","orders","invoices","messages"],
    "/groomer": ["dashboard","appointments","schedule","grooming-records","pets"],
    "/frontdesk": ["dashboard","check-in","appointments","customers","pets","orders","schedule","phone-messages"],
    "/learn": ["dashboard","my-learning","course-catalog","in-progress","completed","certificates","resources"],
}

missing = []
for prefix, sections in checks.items():
    for s in sections:
        target = f"{prefix}/{s}"
        if target not in PAGES:
            missing.append(target)

# doors
for door in ["/access-customer","/access-groomer","/access-frontdesk","/admin-login","/learn/sign-in"]:
    if door not in PAGES:
        missing.append(door)

print(f"{len(PAGES)} page routes indexed")
if missing:
    print("MISSING PAGES (nav targets that would 404):")
    for m in missing:
        print("  -", m)
    sys.exit(1)
print("ALL nav targets resolve to real pages ✓")
