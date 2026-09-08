import { IsIn } from 'class-validator';
import { RATINGS, Rating } from '../../srs/sm2';

export class ReviewCardDto {
  @IsIn(RATINGS as readonly string[])
  rating!: Rating;
}
