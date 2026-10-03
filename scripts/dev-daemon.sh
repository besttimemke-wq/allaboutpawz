#!/bin/bash
cd "$(dirname "$0")/.."

# Kill stale
if [ -f .next/dev-daemon.pid ]; then
  OLD=$(cat .next/dev-daemon.pid)
  kill -9 "$OLD" 2>/dev/null || true
  rm -f .next/dev-daemon.pid
fi

# Start directly with next dev (skip the tee pipeline that causes death)
mkdir -p .next
setsid bash -c 'cd /home/z/my-project && exec ./node_modules/.bin/next dev -p 3000 > dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
DEV_PID=$!
echo "$DEV_PID" > .next/dev-daemon.pid

# Wait for ready
for i in $(seq 1 30); do
  if curl -s --connect-timeout 2 http://localhost:3000 >/dev/null 2>&1; then
    echo "Server ready (PID: $DEV_PID)"
    disown "$DEV_PID" 2>/dev/null || true
    exit 0
  fi
  sleep 1
done
echo "ERROR: timeout"
exit 1
