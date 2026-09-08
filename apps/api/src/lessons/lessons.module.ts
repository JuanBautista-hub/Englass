import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { CatalogDeprecationService } from './catalog-deprecation.service';
import { ConfigDefaultsModule } from '../common/config';

@Module({
  imports: [ConfigDefaultsModule],
  controllers: [LessonsController],
  providers: [LessonsService, CatalogDeprecationService],
  exports: [LessonsService, CatalogDeprecationService],
})
export class LessonsModule {}
