import { BadRequestException, Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TtsService } from './tts.service';

export class SynthesizeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;
}

@Controller('tts')
@UseGuards(JwtAuthGuard)
export class TtsController {
  constructor(private readonly tts: TtsService) {}

  @Post()
  async synthesize(@Body() dto: SynthesizeDto, @Res() res: Response): Promise<void> {
    if (!dto.text.trim()) {
      throw new BadRequestException('empty_text');
    }
    const { buffer, voice, durationMs } = this.tts.synthesizeMock(dto.text);
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': buffer.byteLength.toString(),
      'X-TTS-Voice': voice,
      'X-TTS-Duration-Ms': durationMs.toString(),
      'X-TTS-Provider': 'mock',
      'Cache-Control': 'no-store',
    });
    res.status(200).end(Buffer.from(buffer));
  }
}
