import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole, DealType } from '@prisma/client';
import { AdminProductsService } from './admin-products.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

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
  remove(@Param('id') id: string) {
    return this.adminProductsService.remove(id);
  }

  @Post('bulk/deal-type')
  bulkUpdateDealType(
    @Body() body: { ids: string[]; dealType: DealType }
  ) {
    return this.adminProductsService.bulkUpdateDealType(body.ids, body.dealType);
  }

  @Post('bulk/delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.adminProductsService.bulkDelete(body.ids);
  }
}
