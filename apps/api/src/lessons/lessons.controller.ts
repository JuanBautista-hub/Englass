import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { LessonsService } from './lessons.service';
import type { EnrollResult } from '@engclass/shared';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CatalogDeprecationService } from './catalog-deprecation.service';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(
    private readonly lessons: LessonsService,
    private readonly deprecation: CatalogDeprecationService,
  ) {}

  @Get('catalog')
  catalog() {
    return this.lessons.listCatalog();
  }

  @Get('catalog/by-level')
  catalogByLevel() {
    return this.lessons.listCatalogByLevel();
  }

  @Get('catalog/:id')
  @Header('Deprecation', 'true')
  catalogLesson(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.deprecation.recordHit();
    res.setHeader('Sunset', this.deprecation.sunsetDateHttp());
    res.setHeader(
      'Link',
      `<${this.deprecation.successorUrl(id)}>; rel="successor-version"`,
    );
    return this.lessons.findOneAsCatalog(id, req.user.id);
  }

  @Post('catalog/:id/enroll')
  @HttpCode(200)
  async enroll(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EnrollResult> {
    const result = await this.lessons.enrollInCatalog(req.user.id, id);
    if (result.created) {
      res.status(201);
    }
    return result;
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.lessons.list(req.user.id);
  }

  @Get('grouped')
  async grouped(@Req() req: AuthenticatedRequest) {
    const rows = await this.lessons.listOwnedByLevel(req.user.id);
    if (rows.length === 0) {
      await this.lessons.autoEnrollAllForUser(req.user.id);
      return this.lessons.listOwnedByLevel(req.user.id);
    }
    return rows;
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
