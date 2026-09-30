import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { initSentry } from './common/sentry';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const sentryOn = initSentry();
  // rawBody: the subscription webhook verifies a provider's signature over the
  // EXACT bytes received; re-serialising the parsed JSON would change them and
  // every signature would fail.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const isProd = config.get<string>('NODE_ENV') === 'production';

  // Render terminates TLS and forwards the request; trust exactly ONE proxy hop
  // so req.ip is the real client (the rate limiter keys anonymous callers on
  // it). `true` would trust the whole X-Forwarded-For chain, which the client
  // writes itself — anyone could then pick a fresh IP per request.
  app.set('trust proxy', 1);

  // Security headers (HSTS, nosniff, no framing, …). This API only ever serves
  // JSON, so helmet's defaults fit as-is — except the resource policy, which
  // must allow cross-origin reads by our own web app.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS — required only by the browser build (docs/web-app-plan.md). Native
  // apps send no Origin, so this was never needed before; without it the web
  // app loads but every data call is blocked by the browser.
  //
  // Allowed: our own production sites, plus anything listed in WEB_ORIGINS
  // (comma-separated — add a preview deployment's exact URL there when you need
  // one). No wildcards on shared hosts: anyone can deploy to *.vercel.app.
  // localhost only outside production.
  //
  // `credentials: false` because nothing uses cookies — every call carries a
  // bearer token the page holds itself. So a foreign origin gains nothing from
  // the browser that it couldn't do with curl.
  const extraOrigins = (config.get<string>('WEB_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: [
      'https://app.seamflowtech.com',
      'https://www.seamflowtech.com',
      'https://seamflowtech.com',
      ...(isProd ? [] : [/^http:\/\/localhost:\d+$/]),
      ...extraOrigins,
    ],
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    // X-Client-Platform is sent on EVERY request by the apps (it is how the
    // server refuses a checkout from a store build). Leaving it out of this
    // list does not just break checkout: the browser refuses the preflight, so
    // every single request from the web build fails before it is sent, and the
    // app sits on cached data with no error anyone can see.
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Platform'],
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
