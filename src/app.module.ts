import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { AppConfigModule } from './common/config/config.module';
import { DatabaseModule } from './database/database.module';
import { AppCacheModule } from './cache/cache.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: { transport: { target: 'pino-pretty' } },
    }),

    AppConfigModule,
    DatabaseModule,
    AppCacheModule,
    ReportsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: CacheInterceptor }],
})
export class AppModule {}
