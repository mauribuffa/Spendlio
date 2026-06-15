import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreatePersonInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { PeopleService } from './people.service';

@UseGuards(AuthGuard)
@Controller('people')
export class PeopleController {
  constructor(private svc: PeopleService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) { return this.svc.list(u.id); }

  @Post()
  create(@CurrentUser() u: { id: string }, @Body(new ZodPipe(CreatePersonInput)) dto: CreatePersonInput) {
    return this.svc.create(u.id, dto);
  }

  @Post(':id/remind')
  remind(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.svc.remind(u.id, id);
  }
}
