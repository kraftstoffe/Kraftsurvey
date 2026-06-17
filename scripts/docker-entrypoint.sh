#!/bin/sh
set -e

# Compose sets SURVEY_DATABASE_URL; ignore any stale DATABASE_URL Coolify still injects
if [ -n "$SURVEY_DATABASE_URL" ]; then
  export DATABASE_URL="$SURVEY_DATABASE_URL"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: No database URL configured."
  echo "Set POSTGRES_PASSWORD in Coolify (Runtime). Delete DATABASE_URL if it still exists there."
  exit 1
fi

case "$DATABASE_URL" in
  *127.0.0.1:5432/build*|*build:build@127.0.0.1*)
    echo "ERROR: DATABASE_URL is the Docker build stub."
    echo "Coolify → Environment → DELETE the DATABASE_URL variable entirely."
    echo "Postgres runs inside this compose stack; only POSTGRES_PASSWORD is required."
    exit 1
    ;;
esac

case "${JWT_SECRET:-}" in
  build-stub-jwt-secret-for-docker-build-only|build-stub-jwt-secret)
    echo "ERROR: JWT_SECRET is still the Docker build stub."
    echo "Coolify → Environment → set JWT_SECRET to: openssl rand -hex 32"
    exit 1
    ;;
esac

if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET is not set."
  exit 1
fi

PRISMA="node ./prisma-cli/node_modules/prisma/build/index.js"
INIT_MIGRATION="20250615120000_init"

is_connection_error() {
  printf '%s' "$1" | grep -qiE 'P1001|P1000|ECONNREFUSED|connection refused|Connection terminated|timeout|not reachable|Can.t reach database'
}

is_schema_conflict() {
  printf '%s' "$1" | grep -qiE 'P3005|P3018|already exists|relation .* already exists|42P07|type .* already exists'
}

baseline_existing_database() {
  echo "Existing database detected (db-push era). Running idempotent upgrade..."
  if [ -f ./scripts/upgrade-db-push.sql ]; then
    $PRISMA db execute --file ./scripts/upgrade-db-push.sql --schema ./prisma/schema.prisma
  else
    echo "ERROR: scripts/upgrade-db-push.sql missing from image."
    exit 1
  fi

  echo "Marking init migration as applied..."
  $PRISMA migrate resolve --applied "$INIT_MIGRATION" || true
}

run_migrate_deploy() {
  $PRISMA migrate deploy 2>&1
}

echo "Applying database migrations..."
attempt=0
max_attempts=30
migrated=0

while [ "$attempt" -lt "$max_attempts" ]; do
  output="$(run_migrate_deploy)" && {
    printf '%s\n' "$output"
    migrated=1
    break
  }

  printf '%s\n' "$output"

  if is_schema_conflict "$output"; then
    baseline_existing_database
    output="$(run_migrate_deploy)" && {
      printf '%s\n' "$output"
      migrated=1
      break
    }
    printf '%s\n' "$output"
    echo "ERROR: Migration failed after baselining existing database."
    exit 1
  fi

  if is_connection_error "$output"; then
    attempt=$((attempt + 1))
    echo "Waiting for database... (${attempt}/${max_attempts})"
    sleep 2
    continue
  fi

  echo "ERROR: Migration failed with a non-recoverable error (not retrying 30 times)."
  exit 1
done

if [ "$migrated" -ne 1 ]; then
  echo "Database not ready after ${max_attempts} attempts."
  echo "Check postgres container is healthy and POSTGRES_PASSWORD matches."
  exit 1
fi

echo "Database migrations applied."
echo "Starting Kraftstoff Survey..."
exec node server.js
