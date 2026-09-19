#!/usr/bin/env bash
# Deploys whatever is on origin/main. Lives at /opt/requ/deploy-from-git.sh on the server.
#
# If the new version does not answer, it puts the previous commit back and rebuilds, so a
# bad deploy does not leave the app down.
set -euo pipefail

ROOT=/opt/requ
SRC=$ROOT/src
PORT=3200
cd "$SRC"

PREV=$(git rev-parse HEAD)
git fetch --quiet origin main
NEXT=$(git rev-parse origin/main)
[[ "$PREV" == "$NEXT" ]] && echo "Already on $(git rev-parse --short HEAD). Rebuilding anyway."

build_and_start() {
  cp "$SRC/docker-compose.yml" "$ROOT/docker-compose.yml"
  cd "$ROOT"
  docker compose build --quiet
  docker compose up -d --remove-orphans
}

healthy() {
  for _ in $(seq 1 40); do
    sleep 3
    # The login page is the one route that must always render; if it answers, the server
    # is up and Next has its static assets.
    curl -fsS --max-time 5 -o /dev/null "http://127.0.0.1:$PORT/login" 2>/dev/null && return 0
  done
  return 1
}

echo "Deploying $(git --no-pager log --format='%h %s' -1 "$NEXT")"
git reset --hard --quiet "$NEXT"
build_and_start

if healthy; then
  cd "$SRC"
  echo "Deployed $(git rev-parse --short HEAD) and the app answered."
  docker image prune -f --filter "until=168h" >/dev/null 2>&1 || true
  exit 0
fi

echo "::error::The new version did not come up. Putting ${PREV:0:7} back."
cd "$SRC"
git reset --hard --quiet "$PREV"
build_and_start
if healthy; then echo "Rolled back to ${PREV:0:7}; the app is answering again."
else echo "::error::Rollback also failed. The server needs a look by hand."; fi
exit 1
