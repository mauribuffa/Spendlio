import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { RecapsService } from './recaps.service';

@UseGuards(AuthGuard)
@Controller('recaps')
export class RecapsController {
  constructor(private svc: RecapsService) {}

  // GET /recaps/:month — the user's monthly_summaries row (YYYY-MM); 404 if not built yet.
  @Get(':month')
  get(@CurrentUser() u: { id: string }, @Param('month') month: string) {
    return this.svc.get(u.id, month);
  }
}
