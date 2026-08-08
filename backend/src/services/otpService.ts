export interface OTPRecord {
  phone: string;
  otp: string;
  expiresAt: number;
}

const otpMap = new Map<string, OTPRecord>();

export function isValidBDPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.trim().replace(/[\s-]/g, '');
  // Matches +88013-019XXXXXXXX, 88013-019XXXXXXXX, or 013-019XXXXXXXX (11 digits)
  const bdRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
  return bdRegex.test(cleaned);
}

export function normalizeBDPhoneNumber(phone: string): string {
  let cleaned = phone.trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+88')) cleaned = cleaned.substring(3);
  if (cleaned.startsWith('88')) cleaned = cleaned.substring(2);
  return cleaned;
}

export function sendOTP(bookingRef: string, phone: string) {
  if (!isValidBDPhoneNumber(phone)) {
    return {
      success: false,
      error: 'Invalid Bangladeshi phone number. Must be an 11-digit mobile number (e.g. 01712345678).'
    };
  }

  const normalizedPhone = normalizeBDPhoneNumber(phone);
  // Generate random 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 3 * 60 * 1000; // 3 minutes TTL

  otpMap.set(bookingRef, {
    phone: normalizedPhone,
    otp: otpCode,
    expiresAt
  });

  console.log(`📱 [OTP Gateway Service] OTP ${otpCode} generated & sent to ${normalizedPhone} for booking ${bookingRef}`);

  return {
    success: true,
    message: `OTP sent to ${normalizedPhone}`,
    normalized_phone: normalizedPhone,
    otp_code: otpCode,
    expires_in_seconds: 180
  };
}

export function verifyOTP(bookingRef: string, phone: string, inputOtp: string) {
  if (!isValidBDPhoneNumber(phone)) {
    return {
      success: false,
      error: 'Invalid Bangladeshi phone number format.'
    };
  }

  const record = otpMap.get(bookingRef);
  if (!record) {
    return {
      success: false,
      error: 'No active OTP request found for this booking. Please request a new OTP.'
    };
  }

  if (Date.now() > record.expiresAt) {
    otpMap.delete(bookingRef);
    return {
      success: false,
      error: 'OTP has expired. Please request a new OTP code.'
    };
  }

  const normalizedPhone = normalizeBDPhoneNumber(phone);
  if (record.phone !== normalizedPhone) {
    return {
      success: false,
      error: 'Phone number does not match the OTP recipient.'
    };
  }

  if (record.otp !== inputOtp.trim()) {
    return {
      success: false,
      error: 'Incorrect 6-digit OTP code. Please check and try again.'
    };
  }

  // OTP is verified successfully! Clean up record
  otpMap.delete(bookingRef);
  return {
    success: true,
    message: 'OTP verified successfully!'
  };
}
