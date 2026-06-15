import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CreateReceiptInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ReceiptsService } from './receipts.service';

@UseGuards(AuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private svc: ReceiptsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) { return this.svc.list(u.id); }

  // Step 1: get a presigned PUT url; the client uploads the image bytes directly.
  // The client passes the content hash it computed so the key is content-addressed.
  @Post('presign')
  presign(
    @CurrentUser() u: { id: string },
    @Query('contentType') contentType?: string,
    @Query('sha256') sha256?: string,
  ) {
    return this.svc.presign(u.id, contentType, sha256);
  }

  // Step 2: register the uploaded key → create row + enqueue OCR.
  @Post()
  create(@CurrentUser() u: { id: string }, @Body(new ZodPipe(CreateReceiptInput)) dto: CreateReceiptInput) {
    return this.svc.create(u.id, dto);
  }

  // A short-lived URL to view the receipt image (declared before ':id').
  @Get(':id/image-url')
  imageUrl(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.imageUrl(u.id, id); }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.get(u.id, id); }

  @Delete(':id')
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.remove(u.id, id); }
}
