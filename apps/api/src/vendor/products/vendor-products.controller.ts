import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { VendorProductsService } from "./vendor-products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { KycApprovedGuard } from "../../common/guards/kyc-approved.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";

@Controller("vendor/products")
@UseGuards(JwtAuthGuard, RolesGuard, KycApprovedGuard)
@Roles(UserRole.VENDOR)
export class VendorProductsController {
  constructor(private readonly vendorProductsService: VendorProductsService) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProductDto
  ) {
    return this.vendorProductsService.create(user.id, dto);
  }

  @Get()
  findMyProducts(@CurrentUser() user: { id: string }) {
    return this.vendorProductsService.findMyProducts(user.id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.vendorProductsService.update(user.id, id, dto);
  }

  @Delete(":id")
  delete(
    @CurrentUser() user: { id: string },
    @Param("id") id: string
  ) {
    return this.vendorProductsService.delete(user.id, id);
  }
}

