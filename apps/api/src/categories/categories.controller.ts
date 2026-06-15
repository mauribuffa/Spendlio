import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CategoriesService } from './categories.service';

@UseGuards(AuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private svc: CategoriesService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) {
    return this.svc.list(u.id);
  }
}
