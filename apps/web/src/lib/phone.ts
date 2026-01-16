/**
 * Cameroon Phone Number Normalization Utility (Frontend)
 * 
 * Accepts various input formats and normalizes to canonical E.164 format: +237XXXXXXXXX
 * 
 * Valid input formats (all equivalent):
 * - 676858216 (9 digits starting with 6)
 * - 0676858216 (with leading 0)
 * - 237676858216 (with country code, no +)
 * - +237676858216 (full E.164)
 * - 00237676858216 (international format)
 * - With spaces/dashes: 676 858 216, 6-76-85-82-16, etc.
 * 
 * Valid Cameroon mobile numbers start with 6 (after the country code)
 */

export interface PhoneNormalizationResult {
  valid: boolean;
  normalized?: string; // Canonical format: +237XXXXXXXXX
  error?: string;
}

/**
 * Normalize a Cameroon phone number to canonical E.164 format (+237XXXXXXXXX)
 * 
 * @param input - The phone number input in any format
 * @returns Object with valid flag, normalized number, or error message
 */
export function normalizeCameroonPhone(input: string): PhoneNormalizationResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'phoneRequired' };
  }

  // Step 1: Strip all spaces, dashes, dots, parentheses
  let cleaned = input.replace(/[\s\-\.\(\)]/g, '');

  // Step 2: Handle various prefixes
  if (cleaned.startsWith('00237')) {
    // International format: 00237676858216 -> 676858216
    cleaned = cleaned.slice(5);
  } else if (cleaned.startsWith('+237')) {
    // E.164 format: +237676858216 -> 676858216
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('237')) {
    // Country code without +: 237676858216 -> 676858216
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Local format with leading 0: 0676858216 -> 676858216
    cleaned = cleaned.slice(1);
  }

  // Step 3: Validate the remaining number
  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    return { 
      valid: false, 
      error: 'invalidPhone'
    };
  }

  // Step 4: Must start with 6 (Cameroon mobile numbers)
  if (!cleaned.startsWith('6')) {
    return { 
      valid: false, 
      error: 'invalidPhone'
    };
  }

  // Step 5: Return canonical E.164 format
  const normalized = `+237${cleaned}`;

  return {
    valid: true,
    normalized,
  };
}

/**
 * Quick validation check without returning the normalized value
 */
export function isValidCameroonPhone(input: string): boolean {
  return normalizeCameroonPhone(input).valid;
}

/**
 * Format phone for display (add spaces for readability)
 * +237676858216 -> +237 676 858 216
 */
export function formatPhoneForDisplay(phone: string): string {
  const result = normalizeCameroonPhone(phone);
  if (!result.valid || !result.normalized) {
    return phone;
  }
  
  // +237676858216 -> +237 676 858 216
  const num = result.normalized;
  return `${num.slice(0, 4)} ${num.slice(4, 7)} ${num.slice(7, 10)} ${num.slice(10)}`;
}
