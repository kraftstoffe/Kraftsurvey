#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Coolify → Environment → add your internal Postgres URL (Runtime required)."
  exit 1
fi

case "$DATABASE_URL" in
  *127.0.0.1:5432/build*|*build:build@127.0.0.1*)
    echo "ERROR: DATABASE_URL is still the Docker build stub (127.0.0.1:5432/build)."
    echo "Coolify → Environment → DATABASE_URL must be your internal Postgres URL, e.g.:"
    echo "  postgresql://USER:PASS@YOUR-POSTGRES-CONTAINER:5432/kraftstoff_survey?schema=public"
    echo "Enable 'Available at Runtime'. Do NOT use the build stub in production."
    exit 1
    ;;
esac

echo "Applying database schema..."
attempt=0
max_attempts=30

until node ./node_modules/prisma/build/index.js db push; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database not ready after ${max_attempts} attempts."
    echo "Check DATABASE_URL uses the Coolify Postgres internal hostname (not localhost)."
    exit 1
  fi
  echo "Waiting for database... (${attempt}/${max_attempts})"
  sleep 2
done

echo "Database schema applied."
echo "Starting Kraftstoff Survey..."
exec node server.js
