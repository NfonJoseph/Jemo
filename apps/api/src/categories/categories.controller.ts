import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Get all active categories
   * Public endpoint - no auth required
   */
  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }
}
