import { Module } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { CefrLevelsController, MasteryLabelsController } from './labels.controller';

@Module({
  providers: [LabelsService],
  controllers: [CefrLevelsController, MasteryLabelsController],
  exports: [LabelsService],
})
export class LabelsModule {}