import { IsNumber, IsEnum, IsString, Min, IsNotEmpty } from 'class-validator';
import { PayoutMethod } from '@prisma/client';

export class RequestPayoutDto {
  @IsNumber()
  @Min(1000, { message: 'Minimum withdrawal is 1000 XAF' })
  amount!: number;

  @IsEnum(PayoutMethod, {
    message: 'Method must be CM_MOMO or CM_OM',
  })
  method!: PayoutMethod;

  @IsString()
  @IsNotEmpty({ message: 'Destination phone is required' })
  destinationPhone!: string;
}
