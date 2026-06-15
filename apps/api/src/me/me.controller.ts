import { Controller, Get, Inject, NotFoundException, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '@spendlio/db';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { DB } from '../db/db.module';

@UseGuards(AuthGuard)
@Controller('me')
export class MeController {
  constructor(@Inject(DB) private db: any) {}

  @Get()
  async me(@CurrentUser() u: { id: string }) {
    const [row] = await this.db.select().from(users).where(eq(users.id, u.id));
    if (!row) throw new NotFoundException();
    return row;
  }
}
