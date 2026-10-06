#!/bin/bash
# spawn-keeper.sh — launch the dev-keeper as a double-forked daemon.
# The intermediate short-lived parent detaches the keeper from the calling
# shell's process tree so it survives shell recycling between tool commands.
# (Direct single setsid does NOT survive here; double-fork does.)
cd /home/z/my-project
bash -c 'setsid bash /home/z/my-project/scripts/dev-keeper.sh < /dev/null > /dev/null 2>&1 & sleep 1'
