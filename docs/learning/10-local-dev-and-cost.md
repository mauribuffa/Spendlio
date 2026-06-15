# 10 · Local dev & keeping it (near) zero-cost

> Goal: develop entirely on your laptop for **$0**, and deploy for as little as possible. Everything stateful runs in **Docker** locally; we only reach for paid cloud when we deploy, and even then we lean on free tiers.

## The principle: depend on *interfaces*, not vendors

We never hard-code "AWS S3" or "Upstash Redis" into the app. We code against a small **interface** (a storage port, a queue connection string) and point it at:
- **local:** a Docker container (free), and
- **prod:** a managed service (free tier, or cheapest option).

Swapping is a config change, not a code change. This is why MinIO works locally and S3/R2 works in prod with the same code.

## Local stack — Docker Compose ($0)

One `docker-compose.yml` at the repo root brings up everything the app needs:

```yaml
services:
  postgres:                 # the database
    image: postgres:16
    environment:
      POSTGRES_USER: spendlio
      POSTGRES_PASSWORD: spendlio
      POSTGRES_DB: spendlio
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:                    # BullMQ queue backing store
    image: redis:7
    ports: ["6379:6379"]

  minio:                    # S3-compatible blob storage (receipt images)
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: spendlio
      MINIO_ROOT_PASSWORD: spendlio123
    ports: ["9000:9000", "9001:9001"]   # API + web console
    volumes: ["miniodata:/data"]

volumes: { pgdata: {}, miniodata: {} }
```

`docker compose up -d` and you have Postgres + Redis + MinIO running, persisted in volumes, for free. The apps read connection strings from `.env`.

### MinIO = local S3 for receipt images
Receipt photos are **blobs**, not DB rows — they live in object storage. MinIO speaks the **S3 API**, so we use the standard AWS S3 SDK pointed at `http://localhost:9000`. In production we change three env vars (endpoint, key, secret) to point at real S3 or **Cloudflare R2** — *no code change*. R2 is attractive: S3-compatible and **zero egress fees**.

```
STORAGE_ENDPOINT=http://localhost:9000   # prod: R2/S3 endpoint
STORAGE_BUCKET=receipts
STORAGE_KEY=spendlio
STORAGE_SECRET=spendlio123
```

The app uses **pre-signed URLs**: the client uploads the image straight to storage with a short-lived signed URL (the API never proxies the bytes), then sends the resulting object key. → see the receipt flow in `07-queues-jobs.md`.

## The storage abstraction (`packages/storage`)

A tiny package with one interface so the rest of the app never imports an S3 SDK directly:

```ts
export interface BlobStore {
  presignUpload(key: string, contentType: string): Promise<string>; // PUT url
  presignDownload(key: string): Promise<string>;                    // GET url
  delete(key: string): Promise<void>;
}
// one implementation (S3Store) works for MinIO, S3, and R2.
```

## Deploying cheap — options (⬜ pick when we get there)

Ranked by cost, cheapest first:

| Approach | Cost | Notes |
|---|---|---|
| **Single small VPS + Docker Compose** (Hetzner ~€4/mo) | ~$5/mo | you run the *same* compose file in prod; you own everything; most learning |
| **Free managed tiers** | $0 to start | **Neon** (Postgres free tier), **Upstash** (Redis free tier), **Cloudflare R2** (10GB free), web on **Vercel** free / **Cloudflare Pages**; API on **Fly.io** / **Railway** free-ish |
| **AWS** | $$ + complexity | powerful, but not the cheapest or simplest to learn on |

**My lean for "as cheap as possible while learning":** start with the **free managed tiers** (zero standing cost, nothing to babysit). If you want full control and to practice ops, the **single Hetzner VPS running your compose file** is ~$5/mo and teaches you deployment end-to-end. We'll log the choice in `decisions.md` when we deploy.

## Reproducible dev

- **One command up:** `docker compose up -d` then `pnpm dev` (Turborepo runs web + api).
- **Migrations on boot:** `pnpm db:migrate` applies Drizzle migrations to local Postgres.
- **Seed script:** inserts default categories + a demo user so the app isn't empty.
- **`.env.example`** committed; real `.env` git-ignored. Same variable *names* locally and in prod — only the *values* change.
