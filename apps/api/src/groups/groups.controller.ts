import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateGroupInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { GroupsService } from './groups.service';

@UseGuards(AuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private svc: GroupsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) { return this.svc.list(u.id); }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body(new ZodPipe(CreateGroupInput)) dto: CreateGroupInput) {
    return this.svc.create(u.id, dto);
  }
}
