import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        if (!process.env.REDIS_URL) {
          return {
            ttl: 60, // seconds
            max: 1000,
          };
        }

        return {
          // v2: store는 await redisStore(...)
          store: await redisStore({
            url: process.env.REDIS_URL,
            username: process.env.REDIS_USER,
            password: process.env.REDIS_PASSWORD,
            name: 'lol',
          }),
          ttl: 60, // seconds
          max: 1000,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
