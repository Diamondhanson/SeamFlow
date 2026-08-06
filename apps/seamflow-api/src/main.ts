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

  // CORS — required only by the browser build (docs/web-app-plan.md). Native
  // apps send no Origin, so this was never needed before; without it the web
  // app loads but every data call is blocked by the browser.
  //
  // Allowed: the production web app, the marketing site, local dev servers,
  // and any preview deployment (Vercel/Render) via the extra origins env var.
  const extraOrigins = (config.get<string>('WEB_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: [
      'https://app.seamflowtech.com',
      'https://www.seamflowtech.com',
      'https://seamflowtech.com',
      /^http:\/\/localhost:\d+$/,
      /\.vercel\.app$/,
      /\.onrender\.com$/,
      ...extraOrigins,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

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
