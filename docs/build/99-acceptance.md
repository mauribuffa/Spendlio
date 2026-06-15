# Build step 99 · Phase 1 acceptance

Phase 1 (the foundation) is complete when **all** of these pass.

## Commands
```bash
pnpm install
docker compose up -d
cp .env.example .env            # if not already
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm typecheck
pnpm --filter @spendlio/core test
```

## Checklist
- [ ] `pnpm install` resolves the workspace; `@spendlio/*` packages link.
- [ ] `docker compose ps` shows **postgres, redis, minio** up; the **`receipts`** bucket exists in MinIO.
- [ ] `pnpm db:migrate` applied migrations with no error; `psql "$DATABASE_URL" -c '\dt'` lists the tables.
- [ ] `pnpm db:seed` inserted the **12 default categories** and a demo user.
- [ ] `pnpm typecheck` is green across all packages.
- [ ] `@spendlio/core` tests pass; a 3-way split of $10.00 returns `[334,333,333]` and sums to exactly `1000`.
- [ ] `@spendlio/contracts` exports parse valid data and reject invalid (e.g. non-integer `amount`).

## Structure sanity
```
spendlio/
├─ package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json
├─ docker-compose.yml  .env.example  .env  CLAUDE.md
├─ docs/{learning,build}/
└─ packages/
   ├─ config/  contracts/  core/  db/
   └─ (ui = the design system; queue/storage/api/web come in later phases)
```

## Golden-rule audit (quick)
- [ ] Nothing in `contracts` or `core` imports a framework, a DB driver, or React.
- [ ] Every money column is `bigint` cents; no `float`/`numeric` money anywhere.
- [ ] Every user-owned table has `user_id` + an index leading with it.

Pass all of the above → move to Phase 2 (API) in `../../BUILD_PLAN.md`.
