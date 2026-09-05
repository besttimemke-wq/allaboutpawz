#!/bin/bash
# .zscripts/dev.sh — custom dev boot script recognized by the sandbox /start.sh.
# Runs at every container boot (parented to the boot tree, immune to the
# tool-shell reaper). Installs deps once, then keeps the Next.js dev server
# on port 3000 alive forever, restarting it if it crashes or gets OOM-killed.
# (The legacy boot flow is broken for this project: it runs `bun run db:push`,
#  a script that no longer exists since Prisma was removed.)
cd /home/z/my-project

bun install >/dev/null 2>&1

exec bash /home/z/my-project/scripts/dev-keeper.sh
