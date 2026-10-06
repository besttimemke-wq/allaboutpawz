#!/usr/bin/env python3
"""Arm a GitHub Actions repo secret with a Supabase access token.

One-time ops tool: encrypts a secret value with the repo's Actions public key
(libsodium sealed box, exactly what GitHub requires) and PUTs it as a repo
secret. Used to wire SUPABASE_ACCESS_TOKEN into CI without opening the
GitHub UI.

Usage (env-provided — nothing is ever written to disk):
  GITHUB_TOKEN=<pat> SECRET_NAME=SUPABASE_ACCESS_TOKEN SECRET_VALUE=<sbp_...> \
    /tmp/ghsec-venv/bin/python3 scripts/github-put-secret.py

The venv lives in /tmp (pynacl only) so the repo's package.json stays clean.
If the venv is gone, rebuild it:
  python3 -m venv /tmp/ghsec-venv && /tmp/ghsec-venv/bin/pip install pynacl
"""

import base64
import json
import os
import sys
import urllib.request

REPO = "besttimemke-wq/allaboutpawz"


def api(method: str, path: str, token: str, body: dict | None = None):
    url = f"https://api.github.com/repos/{REPO}/{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, method=method, data=data, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as res:
        text = res.read().decode()
        return res.status, json.loads(text) if text else {}


def main() -> int:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    name = os.environ.get("SECRET_NAME", "").strip()
    value = os.environ.get("SECRET_VALUE", "").strip()
    if not (token and name and value):
        print("✗ GITHUB_TOKEN, SECRET_NAME, and SECRET_VALUE must all be set.", file=sys.stderr)
        return 2

    status, pk = api("GET", "actions/secrets/public-key", token)
    if status != 200:
        print(f"✗ public-key fetch failed: HTTP {status}", file=sys.stderr)
        return 1

    from nacl import encoding, public
    repo_key = public.PublicKey(pk["key"].encode(), encoding.Base64Encoder())
    sealed = public.SealedBox(repo_key).encrypt(value.encode())
    encrypted = base64.b64encode(sealed).decode()

    status, _ = api("PUT", f"actions/secrets/{name}", token, {
        "encrypted_value": encrypted,
        "key_id": pk["key_id"],
    })
    if status not in (201, 204):
        print(f"✗ secret PUT failed: HTTP {status} (201=created, 204=updated)", file=sys.stderr)
        return 1

    verb = "created" if status == 201 else "updated"
    print(f"✓ repo secret {name} {verb} — CI can now use it as secrets.{name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
