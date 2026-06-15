# Build step 02 · Docker & environment

Goal: Postgres + Redis + MinIO running locally for $0, and an `.env` the apps read.

## Files

**`docker-compose.yml`** (repo root)
```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: spendlio
      POSTGRES_PASSWORD: spendlio
      POSTGRES_DB: spendlio
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U spendlio"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    ports: ["6379:6379"]
    volumes: ["redisdata:/data"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: spendlio
      MINIO_ROOT_PASSWORD: spendlio123
    ports: ["9000:9000", "9001:9001"]
    volumes: ["miniodata:/data"]

  # one-shot: create the "receipts" bucket on startup
  minio-setup:
    image: minio/mc
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "
      until (mc alias set local http://minio:9000 spendlio spendlio123) do sleep 1; done;
      mc mb -p local/receipts;
      mc anonymous set none local/receipts;
      exit 0;"

volumes:
  pgdata: {}
  redisdata: {}
  miniodata: {}
```

**`.env.example`** (repo root — commit this; copy to `.env` which is git-ignored)
```bash
# Database
DATABASE_URL=postgres://spendlio:spendlio@localhost:5432/spendlio

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Object storage (S3-compatible; MinIO locally)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_REGION=us-east-1
STORAGE_BUCKET=receipts
STORAGE_KEY=spendlio
STORAGE_SECRET=spendlio123
STORAGE_FORCE_PATH_STYLE=true   # required for MinIO; false for AWS S3

# Auth (fill when you reach Phase 5)
AUTH_SECRET=change-me-dev-only
JWT_SECRET=change-me-dev-only

# API
API_PORT=4000
WEB_URL=http://localhost:3000
```

## Bring it up
```bash
docker compose up -d
cp .env.example .env
```

## Acceptance
```bash
docker compose ps                         # postgres, redis, minio all "Up"
psql "$DATABASE_URL" -c '\l'              # connects (or: docker exec -it <pg> psql -U spendlio)
# MinIO console: http://localhost:9001  (login spendlio / spendlio123) — "receipts" bucket exists
redis-cli -u "$REDIS_URL" ping            # PONG
```

## Why these choices
Same env-var **names** locally and in production — only the **values** change (point `STORAGE_*` at R2/S3, `DATABASE_URL` at Neon, `REDIS_URL` at Upstash). The app never imports a vendor SDK directly; it reads these. See `docs/learning/10-local-dev-and-cost.md`.
