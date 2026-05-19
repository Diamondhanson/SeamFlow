import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { initSentry } from './common/sentry';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const sentryOn = initSentry();
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`SeamFlow API listening on http://localhost:${port}`);
  logger.log(`Sentry: ${sentryOn ? 'enabled' : 'disabled'}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal during bootstrap:', err);
  process.exit(1);
});
