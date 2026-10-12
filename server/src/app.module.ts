import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  DEFAULT_THROTTLE_LIMIT,
  THROTTLE_MESSAGE,
  THROTTLE_TTL_MS,
} from './throttle.constants';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'tracker',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // use migrations instead
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),
    ThrottlerModule.forRoot({
      // Generous global default so debounced autosaves are never blocked;
      // auth endpoints override this with a stricter per-IP limit.
      throttlers: [
        {
          name: 'default',
          ttl: THROTTLE_TTL_MS,
          limit: DEFAULT_THROTTLE_LIMIT,
        },
      ],
      errorMessage: THROTTLE_MESSAGE,
    }),
    UsersModule,
    StorageModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
