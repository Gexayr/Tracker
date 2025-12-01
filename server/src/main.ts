import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  });
  const port = +(process.env.PORT || 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
}
bootstrap();
