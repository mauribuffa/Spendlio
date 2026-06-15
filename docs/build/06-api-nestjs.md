# Build step 06 · API (NestJS) — Phase 2

Goal: a NestJS HTTP API that validates every input with `@spendlio/contracts`, persists via `@spendlio/db`, and uses `@spendlio/core` for domain math. We build the **foundation + the `transactions` resource as the template**; every other module (budgets, accounts, categories, receipts, splits) follows the same shape.

> Golden rules in play: validate at the edge (contracts), thin controllers → services → core/db, every query scoped by `userId`. See `docs/learning/05-api-nestjs.md`.

## Setup
```bash
mkdir -p apps/api/src
pnpm --filter @spendlio/api add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
pnpm --filter @spendlio/api add @spendlio/contracts @spendlio/core @spendlio/db zod
pnpm --filter @spendlio/api add -D @nestjs/cli @types/express tsx typescript
```
**`apps/api/package.json`** (scripts)
```json
{
  "name": "@spendlio/api",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.http.ts",
    "build": "nest build",
    "start": "node dist/main.http.js",
    "typecheck": "tsc --noEmit"
  }
}
```
Add `apps/api/tsconfig.json` (extends base; enable `"experimentalDecorators": true, "emitDecoratorMetadata": true`) and `nest-cli.json`.

## Bootstrap — **`src/main.http.ts`**
```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_URL, credentials: true });
  app.setGlobalPrefix('api');
  await app.listen(Number(process.env.API_PORT ?? 4000));
}
bootstrap();
```

## DB provider — **`src/db/db.module.ts`**
```ts
import { Global, Module } from '@nestjs/common';
import { db } from '@spendlio/db';

export const DB = Symbol('DB');

@Global()
@Module({ providers: [{ provide: DB, useValue: db }], exports: [DB] })
export class DbModule {}
```

## Validate at the edge — **`src/common/zod.pipe.ts`**
```ts
import { PipeTransform, BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

export class ZodPipe<T> implements PipeTransform {
  constructor(private schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (!r.success) {
      throw new BadRequestException({ error: 'validation', issues: r.error.flatten() });
    }
    return r.data;
  }
}
```

## Auth (dev stub now; real JWT in Phase 5) — **`src/common/`**
```ts
// auth.guard.ts — replace the stub body with JWT verification in Phase 5 (ADR-009)
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    // DEV ONLY: trust a header so you can build the API before auth exists.
    req.user = { id: req.header('x-user-id') ?? '00000000-0000-0000-0000-000000000001' };
    return true;
  }
}

// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
```
> Every controller is guarded and reads `userId` from `CurrentUser` — never from the body/query. This is the data-isolation rule from `08-auth-security.md`.

## Cursor pagination — **`src/common/pagination.ts`**
```ts
export interface Cursor { occurredAt: string; id: string }
export const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
export const decodeCursor = (s?: string): Cursor | null =>
  s ? JSON.parse(Buffer.from(s, 'base64url').toString()) : null;
```

## The `transactions` resource (the template)

**`src/transactions/transactions.service.ts`**
```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, lt, or } from 'drizzle-orm';
import { transactions } from '@spendlio/db';
import type { CreateTransactionInput, UpdateTransactionInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';
import { decodeCursor, encodeCursor } from '../common/pagination';

@Injectable()
export class TransactionsService {
  constructor(@Inject(DB) private db: any) {}

  async list(userId: string, cursor?: string, limit = 20) {
    const c = decodeCursor(cursor);
    const rows = await this.db.select().from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        c ? lt(transactions.occurredAt, new Date(c.occurredAt)) : undefined,
      ))
      .orderBy(desc(transactions.occurredAt), desc(transactions.id))
      .limit(limit + 1);
    const items = rows.slice(0, limit);
    const next = rows.length > limit
      ? encodeCursor({ occurredAt: items.at(-1)!.occurredAt.toISOString(), id: items.at(-1)!.id })
      : null;
    return { items, nextCursor: next };
  }

  async create(userId: string, dto: CreateTransactionInput) {
    // TODO: if dto.currency !== user's base, compute fx snapshot (see 12-currency-and-fx.md)
    const [row] = await this.db.insert(transactions)
      .values({ ...dto, userId, occurredAt: new Date(dto.occurredAt),
        category: dto.category ?? 'transfer', status: dto.status ?? 'cleared' })
      .returning();
    // TODO: if uncategorized, enqueue a 'categorize' job (Phase 4)
    return row;
  }

  async get(userId: string, id: string) {
    const [row] = await this.db.select().from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)));
    if (!row) throw new NotFoundException();
    return row;
  }

  async update(userId: string, id: string, dto: UpdateTransactionInput) {
    await this.get(userId, id); // ensures ownership
    const [row] = await this.db.update(transactions)
      .set({ ...dto, ...(dto.occurredAt ? { occurredAt: new Date(dto.occurredAt) } : {}), updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return row;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.update(transactions).set({ deletedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return { ok: true };
  }
}
```

**`src/transactions/transactions.controller.ts`**
```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreateTransactionInput, UpdateTransactionInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { TransactionsService } from './transactions.service';

@UseGuards(AuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private svc: TransactionsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }, @Query('cursor') cursor?: string) {
    return this.svc.list(u.id, cursor);
  }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body(new ZodPipe(CreateTransactionInput)) dto: CreateTransactionInput) {
    return this.svc.create(u.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.get(u.id, id); }

  @Patch(':id')
  update(@CurrentUser() u: { id: string }, @Param('id') id: string,
         @Body(new ZodPipe(UpdateTransactionInput)) dto: UpdateTransactionInput) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.remove(u.id, id); }
}
```

**`src/transactions/transactions.module.ts`**
```ts
import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
@Module({ controllers: [TransactionsController], providers: [TransactionsService] })
export class TransactionsModule {}
```

**`src/app.module.ts`**
```ts
import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { TransactionsModule } from './transactions/transactions.module';
@Module({ imports: [DbModule, TransactionsModule] })
export class AppModule {}
```

## Repeat for the other resources
Same controller/service/module shape, each guarded + `userId`-scoped + Zod-validated:
- `categories` (list; default + user), `accounts` (CRUD), `budgets` (CRUD + `GET /budgets/status` computed via `core`),
- `splits` (create a split → uses `core` `computeSplit`; `GET /balances` via `core` `netForUser`),
- `receipts` (`POST` → presign upload via `packages/storage`, create row, enqueue `ocr` in Phase 4).

## Acceptance
```bash
pnpm --filter @spendlio/api dev      # starts on :4000
# create (dev auth via header):
curl -s localhost:4000/api/transactions -X POST -H 'content-type: application/json' \
  -H 'x-user-id: <seeded-demo-user-uuid>' \
  -d '{"title":"Coffee","amount":-675,"currency":"USD","occurredAt":"2026-05-31T09:00:00Z","status":"cleared","source":"manual"}'
# list:
curl -s localhost:4000/api/transactions -H 'x-user-id: <seeded-demo-user-uuid>'
# invalid (amount as float) -> 400 with { error:'validation' }:
curl -s localhost:4000/api/transactions -X POST -H 'content-type: application/json' \
  -H 'x-user-id: <uuid>' -d '{"title":"x","amount":1.5,"currency":"USD","occurredAt":"2026-05-31T09:00:00Z","status":"cleared","source":"manual"}'
```

Checklist:
- [ ] `pnpm --filter @spendlio/api typecheck` green.
- [ ] Create/list/get/patch/delete work for transactions, all scoped to the header user.
- [ ] A non-integer `amount` (or missing field) returns **400** from the ZodPipe — bad data never hits the service.
- [ ] Soft delete sets `deleted_at`; deleted rows don't appear in `list`.

Next: Phase 3 (web) consumes these endpoints; Phase 4 wires the `categorize`/`ocr` enqueues; Phase 5 swaps the dev `AuthGuard` for real JWT.
