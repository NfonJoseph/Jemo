import { IsEnum } from "class-validator";
import { DeliveryStatus } from "@prisma/client";

export class UpdateDeliveryStatusDto {
  @IsEnum([DeliveryStatus.PICKED_UP, DeliveryStatus.ON_THE_WAY, DeliveryStatus.DELIVERED], {
    message: "Status must be PICKED_UP, ON_THE_WAY, or DELIVERED",
  })
  status!: DeliveryStatus;
}

