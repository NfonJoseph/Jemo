import { IsString, IsOptional } from 'class-validator';

export class ProductReviewDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
