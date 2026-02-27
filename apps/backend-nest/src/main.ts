import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['auth'] });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 9001;

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 NestJS API запущен на http://localhost:${port}`);
  console.log(`   Доступен по сети: http://192.0.2.17:${port}`);
}

bootstrap();
