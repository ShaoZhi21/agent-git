import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Bootstrap the control plane on Fastify. See docs/conventions/backend-structure.md.
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Everything is served under /api. Public, versioned routes live under
  // /api/v1/... (the path prefix comes from each ts-rest contract).
  app.setGlobalPrefix('api');

  // Uniform error shape (RFC 9457 problem+json).
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`AgentGit API listening on :${port}`, 'Bootstrap');
}

void bootstrap();
