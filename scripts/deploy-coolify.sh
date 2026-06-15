#!/usr/bin/env bash
# Trigger a Coolify redeploy for Kraftstoff Survey and wait for /api/health.
#
# Setup:
#   cp scripts/coolify.env.example scripts/.coolify.env
#   # edit scripts/.coolify.env
#
# Usage:
#   ./scripts/deploy-coolify.sh
#   ./scripts/deploy-coolify.sh --push
#   ./scripts/deploy-coolify.sh --force
#   ./scripts/deploy-coolify.sh --push --force

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/scripts/.coolify.env"

DO_PUSH=0
DO_FORCE=0

for arg in "$@"; do
  case "$arg" in
    --push) DO_PUSH=1 ;;
    --force) DO_FORCE=1 ;;
    -h|--help)
      echo "Usage: $0 [--push] [--force]"
      echo "  --push   git push origin master before deploy"
      echo "  --force  Coolify rebuild without cache"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy scripts/coolify.env.example and configure it." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${COOLIFY_URL:?Set COOLIFY_URL in scripts/.coolify.env}"
: "${COOLIFY_TOKEN:?Set COOLIFY_TOKEN in scripts/.coolify.env}"
: "${COOLIFY_RESOURCE_UUID:?Set COOLIFY_RESOURCE_UUID in scripts/.coolify.env}"

HEALTH_URL="${HEALTH_URL:-https://survey.kraftstoff.app/api/health}"
GIT_BRANCH="${GIT_BRANCH:-master}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
MAX_WAIT="${MAX_WAIT:-900}"
POLL_INTERVAL="${POLL_INTERVAL:-15}"

COOLIFY_URL="${COOLIFY_URL%/}"

if [[ "$DO_PUSH" -eq 1 || "${GIT_PUSH:-0}" == "1" ]]; then
  echo "→ Pushing ${GIT_REMOTE}/${GIT_BRANCH}..."
  git -C "$ROOT" push "$GIT_REMOTE" "$GIT_BRANCH"
fi

echo "→ Triggering Coolify deploy (${COOLIFY_RESOURCE_UUID})..."

FORCE_JSON="false"
if [[ "$DO_FORCE" -eq 1 ]]; then
  FORCE_JSON="true"
fi

RESPONSE="$(curl -fsS -X POST "${COOLIFY_URL}/api/v1/deploy" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"uuid\":\"${COOLIFY_RESOURCE_UUID}\",\"force\":${FORCE_JSON}}")"

echo "$RESPONSE"
echo "→ Waiting for health (${HEALTH_URL}, max ${MAX_WAIT}s)..."

elapsed=0
while [[ "$elapsed" -lt "$MAX_WAIT" ]]; do
  if BODY="$(curl -fsS "$HEALTH_URL" 2>/dev/null)"; then
    if echo "$BODY" | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
      if echo "$BODY" | grep -q '"db"[[:space:]]*:[[:space:]]*true'; then
        echo "✓ Deploy OK — database connected"
        echo "$BODY"
        exit 0
      fi
      if echo "$BODY" | grep -q '"db"'; then
        echo "  App up, database not ready yet… (${elapsed}s)"
      else
        echo "  App up (legacy health, no db field)… (${elapsed}s)"
        echo "$BODY"
        exit 0
      fi
    fi
  fi

  sleep "$POLL_INTERVAL"
  elapsed=$((elapsed + POLL_INTERVAL))
done

echo "✗ Health check timed out after ${MAX_WAIT}s" >&2
echo "  Check Coolify deployment logs for the app service." >&2
exit 1
