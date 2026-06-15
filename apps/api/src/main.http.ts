import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_URL, credentials: true });
  app.setGlobalPrefix('api');
  await app.listen(Number(process.env.API_PORT ?? 4000));
}
bootstrap();
