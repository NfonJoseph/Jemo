import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /**
   * Get current user's favorites (paginated)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserFavorites(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.favoritesService.getUserFavorites(
      user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /**
   * Toggle favorite for a product (add if not favorited, remove if favorited)
   */
  @Post(':productId/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleFavorite(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.toggleFavorite(user.id, productId);
  }

  /**
   * Add product to favorites
   */
  @Post(':productId')
  @UseGuards(JwtAuthGuard)
  async addFavorite(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    await this.favoritesService.addFavorite(user.id, productId);
    return { success: true, isFavorited: true };
  }

  /**
   * Remove product from favorites
   */
  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  async removeFavorite(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    await this.favoritesService.removeFavorite(user.id, productId);
    return { success: true, isFavorited: false };
  }

  /**
   * Check if a product is favorited
   */
  @Get(':productId/check')
  @UseGuards(JwtAuthGuard)
  async checkFavorite(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    const isFavorited = await this.favoritesService.isFavorited(user.id, productId);
    return { isFavorited };
  }
}
