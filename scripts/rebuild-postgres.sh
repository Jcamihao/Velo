#!/bin/sh
set -eu

project_name="${COMPOSE_PROJECT_NAME:-$(basename "$PWD" | tr '[:upper:]' '[:lower:]')}"
volume_name="${project_name}_postgres-data"
db_user="${POSTGRES_USER:-triluga}"
db_name="${POSTGRES_DB:-triluga}"

docker compose stop backend postgres >/dev/null 2>&1 || true
docker compose rm -f postgres >/dev/null 2>&1 || true
docker volume rm -f "$volume_name" >/dev/null 2>&1 || true
docker compose up -d postgres

until docker compose exec -T postgres pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; do
  sleep 1
done

npm --prefix backend run prisma:deploy
npm --prefix backend run prisma:seed
