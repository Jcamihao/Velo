#!/bin/sh
set -eu

shadow_db="${POSTGRES_DB}_shadow"

if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='${shadow_db}'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE ${shadow_db} OWNER ${POSTGRES_USER};"
fi
