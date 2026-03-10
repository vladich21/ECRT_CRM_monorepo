import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:3000').split(',').map((u) => u.trim()),
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = parseInt(config.get('PORT', '9001'), 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on http://localhost:${port}/api`);
}

bootstrap();
