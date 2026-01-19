import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class CreateReviewDto {
  @IsString()
  orderItemId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Create a review for an order item
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, dto);
  }

  /**
   * Get reviews for a vendor
   */
  @Get('vendor/:vendorProfileId')
  async getVendorReviews(
    @Param('vendorProfileId') vendorProfileId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.reviewsService.getVendorReviews(
      vendorProfileId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
    );
  }

  /**
   * Get reviews for a product
   */
  @Get('product/:productId')
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.reviewsService.getProductReviews(
      productId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
    );
  }

  /**
   * Get vendor stats only
   */
  @Get('vendor/:vendorProfileId/stats')
  async getVendorStats(@Param('vendorProfileId') vendorProfileId: string) {
    return this.reviewsService.getVendorStats(vendorProfileId);
  }

  /**
   * Get product stats only
   */
  @Get('product/:productId/stats')
  async getProductStats(@Param('productId') productId: string) {
    return this.reviewsService.getProductStats(productId);
  }

  /**
   * Check if user can review an order item
   */
  @Get('can-review/:orderItemId')
  @UseGuards(JwtAuthGuard)
  async canReview(
    @CurrentUser() user: { id: string },
    @Param('orderItemId') orderItemId: string,
  ) {
    return this.reviewsService.canReviewOrderItem(user.id, orderItemId);
  }

  /**
   * Get items the user can review (delivered but not yet reviewed)
   */
  @Get('reviewable')
  @UseGuards(JwtAuthGuard)
  async getReviewableItems(@CurrentUser() user: { id: string }) {
    return this.reviewsService.getReviewableItems(user.id);
  }
}
