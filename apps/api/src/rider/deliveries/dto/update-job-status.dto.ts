import { IsEnum } from "class-validator";
import { DeliveryJobStatus } from "@prisma/client";

export class UpdateJobStatusDto {
  @IsEnum([DeliveryJobStatus.DELIVERED, DeliveryJobStatus.CANCELLED], {
    message: "Status must be DELIVERED or CANCELLED",
  })
  status!: DeliveryJobStatus;
}
