import { Controller, Get, UseGuards } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cefr')
@UseGuards(JwtAuthGuard)
export class CefrLevelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get('levels')
  levels() {
    return this.labels.getLevels();
  }
}

@Controller('mastery')
@UseGuards(JwtAuthGuard)
export class MasteryLabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get('labels')
  labels_() {
    return this.labels.getMasteryLabels();
  }
}