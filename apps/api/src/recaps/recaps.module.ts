import { Module } from '@nestjs/common';
import { RecapsController } from './recaps.controller';

@Module({ controllers: [RecapsController] })
export class RecapsModule {}
