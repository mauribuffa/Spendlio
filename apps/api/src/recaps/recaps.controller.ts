import { Controller, Get, Inject, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { monthlySummaries } from '@spendlio/db';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { DB } from '../db/db.module';

@UseGuards(AuthGuard)
@Controller('recaps')
export class RecapsController {
  constructor(@Inject(DB) private db: any) {}

  // GET /recaps/:month — the user's monthly_summaries row (YYYY-MM); 404 if not built yet.
  @Get(':month')
  async get(@CurrentUser() u: { id: string }, @Param('month') month: string) {
    const [row] = await this.db.select().from(monthlySummaries)
      .where(and(eq(monthlySummaries.userId, u.id), eq(monthlySummaries.month, month)));
    if (!row) throw new NotFoundException();
    return row;
  }
}
