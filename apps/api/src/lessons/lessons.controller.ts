import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get('catalog')
  catalog() {
    return this.lessons.listCatalog();
  }

  @Get('catalog/:id')
  catalogLesson(@Param('id') id: string) {
    return this.lessons.findOneAsCatalog(id);
  }

  @Post('catalog/:id/enroll')
  @HttpCode(201)
  enroll(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.lessons.enrollInCatalog(req.user.id, id);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.lessons.list(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.lessons.findOne(id, req.user.id);
  }

  @Post()
  @HttpCode(201)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateLessonDto) {
    return this.lessons.create(req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessons.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.lessons.remove(id, req.user.id);
  }

  @Get(':id/cards')
  listCards(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.lessons.listCards(id, req.user.id);
  }

  @Post(':id/cards')
  @HttpCode(201)
  addCard(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreateCardDto,
  ) {
    return this.lessons.addCard(id, req.user.id, dto);
  }
}
