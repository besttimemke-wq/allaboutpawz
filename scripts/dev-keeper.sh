#!/bin/bash
# dev-keeper — keeps the Next.js dev server on port 3000 alive forever.
# Spawn via double-fork so it survives shell recycling (see scripts/spawn-keeper.sh).
# Also run at container boot via .zscripts/dev.sh (parented to the boot tree).
# Logs: server output -> dev.log, keeper events -> dev-keeper.log
# (exit code 128+N = killed by signal N).

cd /home/z/my-project

# single-instance lock: only one keeper may run
exec 9>> /tmp/dev-keeper.lock
if ! flock -n 9; then
  echo "$(date -Is) keeper: another keeper already running, exiting" >> dev-keeper.log
  exit 0
fi

while true; do
  if ss -tln 2>/dev/null | grep -q ":3000 "; then
    sleep 5
    continue
  fi
  echo "$(date -Is) keeper: starting next-server" >> dev-keeper.log
  node node_modules/next/dist/bin/next dev -p 3000 >> dev.log 2>&1
  code=$?
  echo "$(date -Is) keeper: next-server exited code=$code" >> dev-keeper.log
  sleep 3
done
