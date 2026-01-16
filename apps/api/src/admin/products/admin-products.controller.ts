import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole, DealType, ProductStatus } from '@prisma/client';
import { AdminProductsService } from './admin-products.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto, ProductReviewDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.adminProductsService.findAll(query);
  }

  @Get('vendors')
  getVendors() {
    return this.adminProductsService.getVendors();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminProductsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.adminProductsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.adminProductsService.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() adminUser: { id: string },
  ) {
    return this.adminProductsService.remove(id, adminUser.id);
  }

  @Post('bulk/deal-type')
  bulkUpdateDealType(
    @Body() body: { ids: string[]; dealType: DealType }
  ) {
    return this.adminProductsService.bulkUpdateDealType(body.ids, body.dealType);
  }

  @Post('bulk/delete')
  bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser() adminUser: { id: string },
  ) {
    return this.adminProductsService.bulkDelete(body.ids, adminUser.id);
  }

  // Product approval endpoints
  @Get('pending')
  findPending(@Query() query: QueryProductsDto) {
    return this.adminProductsService.findPendingProducts(query);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id') id: string,
    @CurrentUser() adminUser: { id: string },
  ) {
    return this.adminProductsService.approveProduct(id, adminUser.id);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id') id: string,
    @Body() dto: { comment: string },
    @CurrentUser() adminUser: { id: string },
  ) {
    return this.adminProductsService.rejectProduct(id, dto.comment, adminUser.id);
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(
    @Param('id') id: string,
    @Body() dto: { comment?: string },
    @CurrentUser() adminUser: { id: string },
  ) {
    return this.adminProductsService.suspendProduct(id, dto.comment, adminUser.id);
  }

  @Patch(':id/reinstate')
  @HttpCode(HttpStatus.OK)
  reinstate(
    @Param('id') id: string,
    @CurrentUser() adminUser: { id: string },
  ) {
    return this.adminProductsService.reinstateProduct(id, adminUser.id);
  }
}
