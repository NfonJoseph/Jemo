import { IsString, IsEnum, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PayoutMethod } from '@prisma/client';

/**
 * Normalize Cameroon phone number to E.164 format (+237XXXXXXXXX)
 * Accepts: 676123456, 237676123456, +237676123456, 6 76 12 34 56, etc.
 */
export function normalizeCameroonPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + if present (we'll add it back)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // If starts with 237, keep as is
  if (cleaned.startsWith('237')) {
    // Validate length: 237 + 9 digits = 12 digits total
    if (cleaned.length === 12) {
      return '+' + cleaned;
    }
  }
  
  // If 9 digits starting with 6 (Cameroon mobile), add 237
  if (cleaned.length === 9 && cleaned.startsWith('6')) {
    return '+237' + cleaned;
  }
  
  // If 9 digits starting with 2 (Cameroon landline), add 237
  if (cleaned.length === 9 && cleaned.startsWith('2')) {
    return '+237' + cleaned;
  }
  
  // Return with + prefix for any other case (will fail validation)
  return '+' + cleaned;
}

/**
 * Validate that phone is a valid Cameroon mobile number
 */
export function isValidCameroonMobile(phone: string): boolean {
  // Must be E.164 format: +237 followed by 9 digits starting with 6
  const regex = /^\+237[6][0-9]{8}$/;
  return regex.test(phone);
}

export class UpdatePayoutProfileDto {
  @IsEnum(PayoutMethod, {
    message: 'Method must be CM_MOMO or CM_OM',
  })
  preferredMethod!: PayoutMethod;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Transform(({ value }) => normalizeCameroonPhone(value))
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must be at most 100 characters' })
  @Transform(({ value }) => value?.trim())
  fullName!: string;
}
