import { IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';

/**
 * DTO for vendor withdrawal request
 * The payout profile (method, phone, name) is fetched from the vendor's saved profile
 */
export class WithdrawDto {
  @IsNumber()
  @Min(1000, { message: 'Minimum withdrawal is 1,000 XAF' })
  @Max(1000000, { message: 'Maximum withdrawal is 1,000,000 XAF per transaction' })
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
