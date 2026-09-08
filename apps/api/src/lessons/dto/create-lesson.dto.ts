import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVELS)[number];

export class CreateLessonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  translation?: string;

  @IsOptional()
  @IsIn(LEVELS)
  level?: Level;
}
