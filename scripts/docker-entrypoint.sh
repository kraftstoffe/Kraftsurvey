#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Add your Coolify Postgres URL to the app environment."
  exit 1
fi

(
  echo "Applying database schema..."
  attempt=0
  max_attempts=30

  until node ./node_modules/prisma/build/index.js db push; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Database not ready after ${max_attempts} attempts."
      echo "Check DATABASE_URL points to your Coolify Postgres (internal URL)."
      exit 1
    fi
    echo "Waiting for database... (${attempt}/${max_attempts})"
    sleep 2
  done

  echo "Database schema applied."
) &

echo "Starting Kraftstoff Survey..."
exec node server.js
