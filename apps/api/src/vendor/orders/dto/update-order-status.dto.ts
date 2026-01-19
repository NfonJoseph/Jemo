import { IsEnum } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class UpdateOrderStatusDto {
  @IsEnum([OrderStatus.CONFIRMED, OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED], {
    message: "Status must be CONFIRMED (to confirm a pending order), IN_TRANSIT (for self-delivery), or CANCELLED.",
  })
  status!: OrderStatus;
}

