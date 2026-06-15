import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { receipts } from '@spendlio/db';
import { getBlobStore, receiptKey } from '@spendlio/storage';
import { enqueue } from '@spendlio/queue';
import type { CreateReceiptInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';

@Injectable()
export class ReceiptsService {
  private blob = getBlobStore();

  constructor(@Inject(DB) private db: any) {}

  /** A short-lived URL the client PUTs the image to directly; bytes skip our API. */
  async presign(userId: string, contentType?: string) {
    const ext = contentType?.split('/')[1] ?? 'jpg';
    return this.blob.presignUpload({ key: receiptKey(userId, ext), contentType });
  }

  /**
   * Register an uploaded image: create the receipt row (status 'processing') and
   * enqueue the id-only `ocr` job. The worker fills merchant/total/ocr later.
   */
  async create(userId: string, dto: CreateReceiptInput) {
    const [row] = await this.db.insert(receipts)
      .values({ userId, imageKey: dto.imageKey, status: 'processing' })
      .returning();
    // jobId auto-derives to `ocr-<receiptId>` (idempotent; BullMQ forbids ':').
    await enqueue('ocr', { receiptId: row.id });
    return row;
  }

  async list(userId: string) {
    const items = await this.db.select().from(receipts)
      .where(and(eq(receipts.userId, userId), isNull(receipts.deletedAt)))
      .orderBy(desc(receipts.createdAt));
    return { items, nextCursor: null };
  }

  async get(userId: string, id: string) {
    const [row] = await this.db.select().from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), isNull(receipts.deletedAt)));
    if (!row) throw new NotFoundException();
    return row;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.update(receipts).set({ deletedAt: new Date() })
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
    return { ok: true };
  }
}
