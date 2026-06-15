import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateSettlementInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { SettlementsService } from './settlements.service';

@UseGuards(AuthGuard)
@Controller('settlements')
export class SettlementsController {
  constructor(private svc: SettlementsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) {
    return this.svc.list(u.id);
  }

  @Post()
  create(
    @CurrentUser() u: { id: string },
    @Body(new ZodPipe(CreateSettlementInput)) dto: CreateSettlementInput,
  ) {
    return this.svc.create(u.id, dto);
  }
}
