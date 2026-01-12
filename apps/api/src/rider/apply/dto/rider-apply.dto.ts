import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RiderApplyDto {
  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsString()
  @IsOptional()
  plateNumber?: string;
}

