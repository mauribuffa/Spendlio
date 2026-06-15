#!/usr/bin/env bash
# One command to bring up the whole dev environment:
# infra (Docker) -> wait for Postgres -> migrate + seed -> app processes (mprocs).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ starting infra (Postgres · Redis · MinIO)…"
docker compose up -d

echo "▶ waiting for Postgres…"
for i in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U spendlio >/dev/null 2>&1; then
    echo "  Postgres ready."
    break
  fi
  if [ "$i" = 60 ]; then echo "✗ Postgres did not become ready in time"; exit 1; fi
  sleep 1
done

echo "▶ applying migrations + seed (idempotent)…"
pnpm db:migrate
pnpm db:seed

echo "▶ launching app processes — api · worker · web (mprocs)…"
exec pnpm exec mprocs
