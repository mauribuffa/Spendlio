import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { receipts, transactions } from '@spendlio/db';
// (sha256 is validated at the API edge by CreateReceiptInput / the presign query.)
import { getBlobStore, receiptKey } from '@spendlio/storage';
import { enqueue, requeue } from '@spendlio/queue';
import type { CreateReceiptInput, ConfirmReceiptInput } from '@spendlio/contracts';
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
      if (existing) return this.toReceipt(existing); // already uploaded — skip re-OCR
    }

    const [row] = await this.db.insert(receipts)
      .values({ userId, imageKey: dto.imageKey, sha256: dto.sha256 ?? null, status: 'processing' })
      .returning();
    // jobId auto-derives to `ocr-<receiptId>` (idempotent; BullMQ forbids ':').
    await enqueue('ocr', { receiptId: row.id });
    return this.toReceipt(row);
  }

  async list(userId: string) {
    const rows = await this.db.select().from(receipts)
      .where(and(eq(receipts.userId, userId), isNull(receipts.deletedAt)))
      .orderBy(desc(receipts.createdAt));
    return { items: rows.map((r: any) => this.toReceipt(r)), nextCursor: null };
  }

  async get(userId: string, id: string) {
    const [row] = await this.db.select().from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), isNull(receipts.deletedAt)));
    if (!row) throw new NotFoundException();
    return this.toReceipt(row);
  }

  /**
   * Approve a reviewed receipt: persist the user-corrected values and create the
   * linked expense transaction. The user has the final word on every money value
   * (OCR is only a suggestion). Rejects a receipt that isn't parsed yet or has
   * already been converted. `total` is integer minor units; stored as a negative
   * expense amount.
   */
  async confirm(userId: string, id: string, dto: ConfirmReceiptInput) {
    const [row] = await this.db.select().from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), isNull(receipts.deletedAt)));
    if (!row) throw new NotFoundException();
    if (row.status !== 'parsed') {
      throw new BadRequestException('Receipt is still being read — try again once it has been scanned.');
    }
    if (row.transactionId) {
      throw new BadRequestException('This receipt has already been turned into an expense.');
    }

    const [txn] = await this.db.insert(transactions).values({
      userId,
      title: dto.merchant ?? 'Receipt',
      merchant: dto.merchant ?? null,
      amount: -Math.abs(dto.total),       // expense — stored negative
      currency: dto.currency,
      category: dto.category,
      occurredAt: dto.occurredAt,
      status: 'cleared',
      source: 'ocr',
      receiptId: id,
    }).returning();

    const ocr = { ...(row.ocr ?? {}), lineItems: dto.lineItems };
    await this.db.update(receipts).set({
      merchant: dto.merchant ?? null,
      total: dto.total,
      currency: dto.currency,
      purchasedAt: dto.occurredAt,
      ocr,
      transactionId: txn.id,
      updatedAt: new Date(),
    }).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));

    // The transaction now exists — kick off categorization (jobId derives to
    // `categorize-<txnId>`, idempotent). OCR can't do this: at scan time there is
    // no transaction yet.
    await enqueue('categorize', { transactionId: txn.id });

    return txn;
  }

  /**
   * Re-run OCR on a failed receipt's existing image. Flips it back to
   * 'processing' (clearing the stale reason) and re-enqueues the id-only job.
   * `requeue` removes the deduped failed job first, otherwise the re-enqueue
   * is a no-op. Rejects anything not currently 'failed'.
   */
  async retry(userId: string, id: string) {
    const [row] = await this.db.select().from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), isNull(receipts.deletedAt)));
    if (!row) throw new NotFoundException();
    if (row.status !== 'failed') {
      throw new BadRequestException("This receipt isn't in a failed state.");
    }

    await this.db.update(receipts)
      .set({ status: 'processing', failureReason: null, updatedAt: new Date() })
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)));

    await requeue('ocr', { receiptId: id });

    const [updated] = await this.db.select().from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), isNull(receipts.deletedAt)));
    return this.toReceipt(updated);
  }

  /** A short-lived URL to view the receipt's image (user-scoped). */
  async imageUrl(userId: string, id: string) {
    const [row] = await this.db.select({ imageKey: receipts.imageKey }).from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), isNull(receipts.deletedAt)));
    if (!row) throw new NotFoundException();
    const url = await this.blob.presignDownload({ key: row.imageKey });
    return { url };
  }

  /**
   * Reshape a db row to the ReceiptSchema contract: the worker stores the OCR
   * result collapsed into the `ocr` JSONB column, so expand `lineItems` (and the
   * raw payload) back out for the client — the row has no separate columns.
   */
  private toReceipt(row: any) {
    const ocr = row.ocr ?? null;
    return {
      ...row,
      lineItems: Array.isArray(ocr?.lineItems) ? ocr.lineItems : [],
      raw: ocr ?? undefined,
    };
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.update(receipts).set({ deletedAt: new Date() })
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
    return { ok: true };
  }
}
