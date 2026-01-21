import { IsEnum } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class UpdateOrderStatusDto {
  @IsEnum([OrderStatus.CONFIRMED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, OrderStatus.CANCELLED], {
    message: "Status must be CONFIRMED, IN_TRANSIT, DELIVERED (for self-delivery), or CANCELLED.",
  })
  status!: OrderStatus;
}

