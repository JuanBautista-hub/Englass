import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LessonsModule } from './lessons/lessons.module';
import { TtsModule } from './tts/tts.module';
import { CategoriesModule } from './categories/categories.module';
import { SrsModule } from './srs/srs.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    LessonsModule,
    TtsModule,
    SrsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
