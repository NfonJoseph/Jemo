import { IsString, IsNumber, IsOptional, IsEnum, IsEmail, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum MobileMoneyProvider {
  MTN_MOBILE_MONEY = 'MTN_MOBILE_MONEY',
  ORANGE_MONEY = 'ORANGE_MONEY',
}

export class CreatePayinDto {
  @IsNumber()
  @Min(100) // Minimum 100 XAF
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string = 'XAF';

  @IsEnum(MobileMoneyProvider)
  paymentMethod!: MobileMoneyProvider;

  @IsString()
  customerName!: string;

  @IsString()
  @Transform(({ value }) => value?.replace(/\s/g, '')) // Remove spaces
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerLang?: string = 'en';

  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  orderReference?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PaymentWebhookDto {
  @IsString()
  transaction_id!: string;

  @IsString()
  transaction_ref!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  customer_phone_number?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
