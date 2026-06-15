import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateBudgetInput, UpdateBudgetInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { BudgetsService } from './budgets.service';

@UseGuards(AuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private svc: BudgetsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) { return this.svc.list(u.id); }

  // NOTE: declared before ':id' so "status" is not captured as an id param.
  @Get('status')
  status(@CurrentUser() u: { id: string }) { return this.svc.status(u.id); }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body(new ZodPipe(CreateBudgetInput)) dto: CreateBudgetInput) {
    return this.svc.create(u.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.get(u.id, id); }

  @Patch(':id')
  update(@CurrentUser() u: { id: string }, @Param('id') id: string,
         @Body(new ZodPipe(UpdateBudgetInput)) dto: UpdateBudgetInput) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.remove(u.id, id); }
}
