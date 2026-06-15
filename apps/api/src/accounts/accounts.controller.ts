import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateAccountInput, UpdateAccountInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AccountsService } from './accounts.service';

@UseGuards(AuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private svc: AccountsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) { return this.svc.list(u.id); }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body(new ZodPipe(CreateAccountInput)) dto: CreateAccountInput) {
    return this.svc.create(u.id, dto);
  }

  @Get('balances')
  balances(@CurrentUser() u: { id: string }) { return this.svc.balances(u.id); }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.get(u.id, id); }

  @Patch(':id')
  update(@CurrentUser() u: { id: string }, @Param('id') id: string,
         @Body(new ZodPipe(UpdateAccountInput)) dto: UpdateAccountInput) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.remove(u.id, id); }
}
