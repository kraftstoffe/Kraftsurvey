#!/bin/sh
set -e

echo "Applying database schema..."
attempt=0
max_attempts=30

until node ./node_modules/prisma/build/index.js db push; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database not ready after ${max_attempts} attempts."
    exit 1
  fi
  echo "Waiting for database... (${attempt}/${max_attempts})"
  sleep 2
done

echo "Starting Kraftstoff Survey..."
exec node server.js
