import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from "class-validator";

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export enum PaymentMethod {
  MOMO = "MOMO",
  OM = "OM",
  COD = "COD",
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  deliveryAddress!: string;

  @IsString()
  @IsNotEmpty()
  deliveryPhone!: string;
}

