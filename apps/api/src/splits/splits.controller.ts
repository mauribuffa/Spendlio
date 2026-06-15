import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateSplitInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { SplitsService } from './splits.service';

@UseGuards(AuthGuard)
@Controller('splits')
export class SplitsController {
  constructor(private svc: SplitsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) { return this.svc.list(u.id); }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body(new ZodPipe(CreateSplitInput)) dto: CreateSplitInput) {
    return this.svc.create(u.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.get(u.id, id); }

  @Delete(':id')
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.remove(u.id, id); }
}

// GET /balances — net who-owes-whom, derived via core. Shares SplitsService.
@UseGuards(AuthGuard)
@Controller('balances')
export class BalancesController {
  constructor(private svc: SplitsService) {}

  @Get()
  balances(@CurrentUser() u: { id: string }) { return this.svc.balances(u.id); }
}
