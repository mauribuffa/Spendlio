import { Body, Controller, Get, Inject, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '@spendlio/db';
import { UpdateUserInput } from '@spendlio/contracts';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodPipe } from '../common/zod.pipe';
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

  @Patch()
  async update(
    @CurrentUser() u: { id: string },
    @Body(new ZodPipe(UpdateUserInput)) dto: UpdateUserInput,
  ) {
    const [row] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(users.id, u.id))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }
}
