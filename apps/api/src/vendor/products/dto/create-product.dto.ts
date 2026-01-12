import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { DeliveryType } from "@prisma/client";

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

