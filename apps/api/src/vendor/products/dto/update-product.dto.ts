import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { DeliveryType } from "@prisma/client";

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

