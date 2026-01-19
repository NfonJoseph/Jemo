import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsNumber, IsString, Min, ValidateNested } from "class-validator";

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

// Payment methods accepted by the API
export enum PaymentMethod {
  COD = "COD",                        // Cash on Delivery
  MTN_MOBILE_MONEY = "MTN_MOBILE_MONEY",  // Online via MTN MoMo
  ORANGE_MONEY = "ORANGE_MONEY",      // Online via Orange Money
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

  @IsString()
  @IsNotEmpty({ message: "Delivery city is required" })
  deliveryCity!: string;  // Buyer's selected delivery city (required)

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;  // Calculated delivery fee
}

