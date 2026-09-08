import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewCardDto } from './dto/review-card.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@Controller('review')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get('stats')
  stats(@Req() req: AuthenticatedRequest) {
    return this.review.getStats(req.user.id);
  }

  @Get('due')
  due(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 50;
    const safeLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 200) : 50;
    return this.review.listAllDueForUser(req.user.id, safeLimit);
  }

  @Get('lessons/:lessonId/due')
  dueForLesson(@Req() req: AuthenticatedRequest, @Param('lessonId') lessonId: string) {
    return this.review.listDueForLesson(req.user.id, lessonId);
  }

  @Post('cards/:cardId')
  @HttpCode(200)
  apply(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
    @Body() dto: ReviewCardDto,
  ) {
    return this.review.applyReview(req.user.id, cardId, dto.rating);
  }
}
