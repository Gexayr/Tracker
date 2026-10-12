import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind nginx: trust one proxy hop so req.ip is the real client IP
  // (used as the rate-limit key) instead of the proxy's address.
  app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '1mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : '*',
  });
  const port = +(process.env.PORT || 3001);
  await app.listen(port);
  new Logger('Bootstrap').log(`Server listening on port ${port}`);
}
void bootstrap();
