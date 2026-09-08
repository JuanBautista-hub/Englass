import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LessonsModule } from './lessons/lessons.module';
import { TtsModule } from './tts/tts.module';
import { CategoriesModule } from './categories/categories.module';
import { SrsModule } from './srs/srs.module';
import { ReviewModule } from './review/review.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LearningPathModule } from './learning-path/learning-path.module';
import { AchievementsModule } from './achievements/achievements.module';
import { LabelsModule } from './labels/labels.module';
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
    ReviewModule,
    DashboardModule,
    LearningPathModule,
    AchievementsModule,
    LabelsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
