#!/bin/bash
# Dev server watchdog — restarts `bun run dev` if it dies.
# Runs in the background. Kills any existing dev server first.

cd /home/z/my-project

# Kill any existing dev server
pkill -f "next dev" 2>/dev/null
pkill -f "bun run dev" 2>/dev/null
pkill -f "watchdog" 2>/dev/null
sleep 2

# Write our PID
echo $$ > /tmp/dev-watchdog.pid

# Loop: start dev server, wait for it to die, restart
while true; do
  echo "[$(date +%H:%M:%S)] Starting dev server..."
  bun run dev > /home/z/my-project/dev.log 2>&1 &
  DEV_PID=$!
  echo $DEV_PID > /tmp/dev-pid
  
  # Wait for the server to be ready (max 30s)
  for i in $(seq 1 30); do
    if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
      echo "[$(date +%H:%M:%S)] Dev server is up (PID $DEV_PID)"
      break
    fi
    sleep 1
  done
  
  # Wait for it to die
  wait $DEV_PID 2>/dev/null
  EXIT_CODE=$?
  echo "[$(date +%H:%M:%S)] Dev server died (exit $EXIT_CODE). Restarting in 3s..."
  sleep 3
  # Clear the .next cache on crash (corrupted cache is a common cause)
  rm -rf .next
done
