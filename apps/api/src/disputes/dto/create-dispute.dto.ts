import { IsString, IsNotEmpty } from "class-validator";

export class CreateDisputeDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}

