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

echo "Applying database migrations..."
attempt=0
max_attempts=30

until node ./node_modules/prisma/build/index.js migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database not ready after ${max_attempts} attempts."
    echo "Check postgres container is healthy and POSTGRES_PASSWORD matches."
    exit 1
  fi
  echo "Waiting for database... (${attempt}/${max_attempts})"
  sleep 2
done

echo "Database migrations applied."
echo "Starting Kraftstoff Survey..."
exec node server.js
