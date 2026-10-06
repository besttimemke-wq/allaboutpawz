#!/usr/bin/env python3
"""Spec 9.7 verification: confirm the Google OAuth client has each environment's
redirect URI registered. Google 302s valid flows to /v3/signin/... and invalid
redirect_uris to /signin/oauth/error (authError encodes redirect_uri_mismatch)."""
import urllib.parse, urllib.request

CID = "476841328245-7h7fqr2io2jd540e34psg2884nn0e51h.apps.googleusercontent.com"
URIS = [
    ("dev Cloud Run ", "https://ais-dev-cb2aatci5phbtljv73uphk-62947767548.us-east1.run.app/api/auth/google/callback"),
    ("pre Cloud Run", "https://ais-pre-cb2aatci5phbtljv73uphk-62947767548.us-east1.run.app/api/auth/google/callback"),
    ("prod aapawz  ", "https://aapawz.com/api/auth/google/callback"),
    ("CONTROL evil ", "https://evil.example.com/api/auth/google/callback"),
]

for label, uri in URIS:
    q = urllib.parse.urlencode({
        "client_id": CID,
        "redirect_uri": uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": "probe",
    })
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{q}"
    req = urllib.request.Request(url, method="GET",
                                 headers={"User-Agent": "Mozilla/5.0"})
    try:
        resp = urllib.request.urlopen(req, timeout=25)
        location = resp.url
    except urllib.error.HTTPError as e:
        location = e.headers.get("Location") or e.headers.get("content-location") or ""
        if not location:
            location = f"HTTP {e.code} (no redirect)"
    if "/signin/oauth/error" in location:
        verdict = "REJECTED (redirect_uri_mismatch)"
    elif "/v3/signin/" in location or "ServiceLogin" in location or "identifier" in location:
        verdict = "ACCEPTED (sign-in flow)"
    else:
        verdict = f"UNKNOWN → {location[:90]}"
    print(f"{label}  {uri}\n    → {verdict}")
