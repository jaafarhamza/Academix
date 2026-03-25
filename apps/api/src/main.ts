import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const trustProxy = configService.get<boolean | string | number>(
    'app.trustProxy',
  );
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.disable('x-powered-by');
  if (trustProxy !== false) {
    expressApp.set('trust proxy', trustProxy);
  }

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string | string[]>('cors.origin'),
    credentials: configService.get<boolean>('cors.credentials'),
    methods: configService.get<string[]>('cors.methods'),
    allowedHeaders: configService.get<string[]>('cors.allowedHeaders'),
    exposedHeaders: configService.get<string[]>('cors.exposedHeaders'),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('app.port') ?? 3001;
  await app.listen(port);
}

void bootstrap();
