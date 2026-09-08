import { Injectable } from '@nestjs/common';
import {
  LEVEL_META,
  MASTERY_META,
  type CefrLevelMeta,
  type MasteryMeta,
} from './labels.constants';
import type { Mastery } from '../srs/mastery';

@Injectable()
export class LabelsService {
  getLevels(): CefrLevelMeta[] {
    return [...LEVEL_META];
  }

  getMasteryLabels(): Record<Mastery, MasteryMeta> {
    return { ...MASTERY_META };
  }
}