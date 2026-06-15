import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { receipts } from '@spendlio/db';
// (sha256 is validated at the API edge by CreateReceiptInput / the presign query.)
import { getBlobStore, receiptKey } from '@spendlio/storage';
import { enqueue } from '@spendlio/queue';
import type { CreateReceiptInput } from '@spendlio/contracts';
import { DB } from '../db/db.module';

@Injectable()
export class ReceiptsService {
  private blob = getBlobStore();

  constructor(@Inject(DB) private db: any) {}

  /**
   * A short-lived URL the client PUTs the image to directly; bytes skip our API.
   * When the client passes the content hash the key is content-addressed
   * (`receipts/<userId>/<sha256>.<ext>`), so re-uploading the same file is a
   * harmless overwrite and dedup works downstream.
   */
  async presign(userId: string, contentType?: string, sha256?: string) {
    const ext = contentType?.split('/')[1] ?? 'jpg';
    return this.blob.presignUpload({ key: receiptKey(userId, ext, sha256), contentType });
  }

  /**
   * Register an uploaded image: create the receipt row (status 'processing') and
   * enqueue the id-only `ocr` job. The worker fills merchant/total/ocr later.
   *
   * Dedup: if this user already has a live (non-deleted) receipt with the same
   * content hash, return it instead of creating a duplicate row + re-running OCR.
   */
  async create(userId: string, dto: CreateReceiptInput) {
    if (dto.sha256) {
      const [existing] = await this.db
        .select()
        .from(receipts)
        .where(and(eq(receipts.userId, userId), eq(receipts.sha256, dto.sha256), isNull(receipts.deletedAt)))
        .limit(1);
      if (existing) return existing; // already uploaded — skip re-OCR
    }

    const [row] = await this.db.insert(receipts)
      .values({ userId, imageKey: dto.imageKey, sha256: dto.sha256 ?? null, status: 'processing' })
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
