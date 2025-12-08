import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';

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
    UsersModule,
    StorageModule,
    AuthModule,
  ],
})
export class AppModule {}
