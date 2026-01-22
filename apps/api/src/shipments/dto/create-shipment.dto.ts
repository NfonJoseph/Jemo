import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class ShipmentQuoteDto {
  @IsString()
  @IsNotEmpty()
  pickupCity!: string;

  @IsString()
  @IsNotEmpty()
  dropoffCity!: string;
}

export class CreateShipmentDto {
  // Pickup details
  @IsString()
  @IsNotEmpty()
  pickupCity!: string;

  @IsString()
  @IsNotEmpty()
  pickupAddress!: string;

  @IsString()
  @IsNotEmpty()
  pickupContactName!: string;

  @IsString()
  @IsNotEmpty()
  pickupPhone!: string;

  // Dropoff details
  @IsString()
  @IsNotEmpty()
  dropoffCity!: string;

  @IsString()
  @IsNotEmpty()
  dropoffAddress!: string;

  @IsString()
  @IsNotEmpty()
  dropoffContactName!: string;

  @IsString()
  @IsNotEmpty()
  dropoffPhone!: string;

  // Package details
  @IsString()
  @IsNotEmpty()
  packageType!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  weightKg?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CancelShipmentDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
