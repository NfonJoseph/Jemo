import { IsEnum } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class UpdateOrderStatusDto {
  @IsEnum([OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY], {
    message: "Status must be PREPARING or OUT_FOR_DELIVERY",
  })
  status!: OrderStatus;
}

