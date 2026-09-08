import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { LearningPathService } from './learning-path.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('learning-path')
@UseGuards(JwtAuthGuard)
export class LearningPathController {
  constructor(private readonly path: LearningPathService) {}

  @Get()
  get(@Req() req: AuthenticatedRequest) {
    return this.path.getLearningPath(req.user.id);
  }
}
