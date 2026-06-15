import { Module } from '@nestjs/common';
import { BalancesController, SplitsController } from './splits.controller';
import { SplitsService } from './splits.service';

@Module({ controllers: [SplitsController, BalancesController], providers: [SplitsService] })
export class SplitsModule {}
