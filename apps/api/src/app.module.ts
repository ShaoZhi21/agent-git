import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HealthModule } from './health/health.module';
import { SystemModule } from './system/system.module';

// Root module. Feature modules are imported here as they are built.
@Module({
  imports: [
    AppConfigModule,
    HealthModule, // native Nest controller (infra/liveness)
    SystemModule, // ts-rest contract reference (feature-endpoint pattern)
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
