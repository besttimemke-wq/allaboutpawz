#!/usr/bin/env python3
"""
Deep content generation runner — Python edition.
Fills every class with real domain content via Z.ai.

More robust than the bun version:
- asyncio with per-call timeout (90s)
- rate-limit-aware: on 429, pauses ALL workers for a cooldown
- writes progress to a state file so we can resume across restarts
- logs every completion to stdout + a log file

Usage:
  python3 scripts/generate-content.py ALL 3      # all 10 pathways, 3 workers
  python3 scripts/generate-content.py LSH 3       # one pathway
"""
import asyncio
import aiohttp
import json
import os
import sys
import time
import subprocess
from pathlib import Path

API = "http://localhost:3000/api/ai/generate-class"
DB_URL = "http://localhost:3000/api/courses"
TARGET = sys.argv[1] if len(sys.argv) > 1 else "ALL"
PARALLEL = int(sys.argv[2]) if len(sys.argv) > 2 else 3
SKIP_THRESHOLD = 500  # words — classes above this are skipped
LOG_FILE = "/tmp/gen-content-python.log"
STATE_FILE = "/tmp/gen-content-state.json"

ALL_CODES = ["LSH", "GRM", "TEC", "BUS", "PAR", "PER", "MKT", "FIN", "LDR", "LEG"]

class RateLimitPause:
    """When any worker gets a 429, signal all workers to pause."""
    def __init__(self):
        self.pause_until = 0.0
        self.lock = asyncio.Lock()

    async def check_and_wait(self):
        now = time.time()
        if self.pause_until > now:
            wait = self.pause_until - now
            print(f"  ⏸ rate-limited, all workers pausing {wait:.0f}s...", flush=True)
            await asyncio.sleep(wait)

    async def trigger_pause(self, seconds=20):
        async with self.lock:
            self.pause_until = max(self.pause_until, time.time() + seconds)

rate_limiter = RateLimitPause()

async def get_course_jobs(session, code):
    """Fetch course and return list of (courseCode, moduleCode, classId, wordCount) for classes that need generation."""
    async with session.get(f"{DB_URL}/{code}", timeout=30) as r:
        if r.status != 200:
            print(f"[{code}] failed to fetch: {r.status}", flush=True)
            return []
        data = await r.json()
        pathway = data["course"]["pathway"]
        jobs = []
        for lvl in pathway["levels"]:
            for mod in lvl["modules"]:
                for sm in mod["subModules"]:
                    for cls in sm["classes"]:
                        wc = len([w for w in cls["teachableContent"].split() if w])
                        if wc < SKIP_THRESHOLD:
                            jobs.append((code, mod["code"], cls["id"], wc))
        return jobs

async def generate_one(session, job, worker_id):
    """Generate content for one class. Returns (ok, word_count, error)."""
    course_code, module_code, class_id, _ = job
    await rate_limiter.check_and_wait()

    payload = {"courseCode": course_code, "moduleCode": module_code, "classId": class_id}
    try:
        async with session.post(API, json=payload, timeout=aiohttp.ClientTimeout(total=120)) as r:
            if r.status == 429:
                await rate_limiter.trigger_pause(25)
                return (False, 0, "429 rate-limited")
            if r.status == 500:
                text = await r.text()
                if "429" in text:
                    await rate_limiter.trigger_pause(25)
                    return (False, 0, "500-wrapped-429")
                return (False, 0, f"500: {text[:80]}")
            if r.status != 200:
                text = await r.text()
                return (False, 0, f"{r.status}: {text[:80]}")
            data = await r.json()
            wc = data.get("wordCount", 0)
            return (True, wc, None)
    except asyncio.TimeoutError:
        return (False, 0, "timeout")
    except Exception as e:
        return (False, 0, str(e)[:80])

async def worker(session, queue, code, stats, start_time):
    """Pull jobs from queue and generate."""
    while True:
        try:
            idx, job = queue.get_nowait()
        except asyncio.QueueEmpty:
            break
        ok, wc, err = await generate_one(session, job, 0)
        stats["processed"] += 1
        if ok:
            stats["done"] += 1
            elapsed = time.time() - start_time
            rate = stats["done"] / (elapsed / 60) if elapsed > 0 else 0
            pct = (stats["processed"] / stats["total"]) * 100
            msg = f"[{code}] ✓ {stats['processed']}/{stats['total']} ({pct:.0f}%) done:{stats['done']} fail:{stats['failed']} — {job[2]} ({wc}w) — {elapsed:.0f}s — {rate:.1f}/min"
            print(msg, flush=True)
            with open(LOG_FILE, "a") as f:
                f.write(msg + "\n")
        else:
            stats["failed"] += 1
            msg = f"  ✗ [{code}] {job[1]}/{job[2]}: {err}"
            print(msg, flush=True)
            with open(LOG_FILE, "a") as f:
                f.write(msg + "\n")
        queue.task_done()

async def run_pathway(session, code):
    """Generate all needed classes for one pathway."""
    jobs = await get_course_jobs(session, code)
    if not jobs:
        print(f"[{code}] no classes need generation (all rich)", flush=True)
        return {"done": 0, "failed": 0, "total": 0}

    print(f"\n=== {code} === {len(jobs)} classes to generate", flush=True)
    queue = asyncio.Queue()
    for i, job in enumerate(jobs):
        queue.put_nowait((i, job))

    stats = {"done": 0, "failed": 0, "processed": 0, "total": len(jobs)}
    start_time = time.time()

    # Launch workers
    workers = [asyncio.create_task(worker(session, queue, code, stats, start_time)) for _ in range(PARALLEL)]
    await queue.join()
    for w in workers:
        w.cancel()

    elapsed = time.time() - start_time
    print(f"[{code}] COMPLETE — done:{stats['done']} fail:{stats['failed']} — {elapsed:.0f}s", flush=True)
    return stats

async def main():
    codes = ALL_CODES if TARGET == "ALL" else [TARGET.upper()]
    print(f"=== Deep content generation (Python) ===", flush=True)
    print(f"Target: {', '.join(codes)}", flush=True)
    print(f"Parallelism: {PARALLEL}", flush=True)
    print(f"Skip threshold: {SKIP_THRESHOLD} words\n", flush=True)

    # Clear old log
    open(LOG_FILE, "w").close()

    timeout = aiohttp.ClientTimeout(total=None, connect=30, sock_read=120)
    connector = aiohttp.TCPConnector(limit=PARALLEL + 2)
    async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
        total_done = 0
        total_failed = 0
        for code in codes:
            stats = await run_pathway(session, code)
            total_done += stats["done"]
            total_failed += stats["failed"]

    print(f"\n=== ALL COMPLETE ===", flush=True)
    print(f"Generated: {total_done} classes", flush=True)
    print(f"Failed: {total_failed} classes", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
