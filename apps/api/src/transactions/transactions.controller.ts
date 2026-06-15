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
