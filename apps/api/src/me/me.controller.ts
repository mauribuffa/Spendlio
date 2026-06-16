import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UpdateUserInput } from '@spendlio/contracts';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodPipe } from '../common/zod.pipe';
import { MeService } from './me.service';

@UseGuards(AuthGuard)
@Controller('me')
export class MeController {
  constructor(private svc: MeService) {}

  @Get()
  me(@CurrentUser() u: { id: string }) {
    return this.svc.get(u.id);
  }

  @Patch()
  update(
    @CurrentUser() u: { id: string },
    @Body(new ZodPipe(UpdateUserInput)) dto: UpdateUserInput,
  ) {
    return this.svc.update(u.id, dto);
  }
}
