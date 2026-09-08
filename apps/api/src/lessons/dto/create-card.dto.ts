import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, Max, MinLength } from 'class-validator';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export class CreateCardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  term!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  definition!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  example?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  translation?: string;

  @IsOptional()
  @IsIn(LEVELS)
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  ordinal?: number;
}
