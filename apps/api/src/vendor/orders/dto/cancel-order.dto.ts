import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty({ message: "Cancellation reason is required" })
  @MaxLength(500, { message: "Reason must not exceed 500 characters" })
  reason!: string;
}
