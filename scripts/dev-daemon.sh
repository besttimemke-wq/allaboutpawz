#!/bin/bash
# dev:daemon — start the Next.js dev server as a session-independent daemon.
# start-stop-daemon --background double-forks to PID 1, so the server
# survives agent-session teardown (the plain `bun run dev` pipeline dies
# with the session). Logs still land in dev.log for the log-reading loop.
cd /home/z/my-project

PIDFILE=/home/z/my-project/.next/dev-daemon.pid

start-stop-daemon --start --background --make-pidfile --pidfile "$PIDFILE" \
  --chdir /home/z/my-project \
  --startas /bin/bash -- \
  -c 'exec ./node_modules/.bin/next dev -p 3000 >> dev.log 2>&1'
