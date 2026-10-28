const crypto = require('crypto');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

const generateOtp = () =>
  crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');

const hashOtp = (otp) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(otp).digest('hex');

const isOtpMatch = (otp, storedHash) => {
  const a = Buffer.from(hashOtp(otp), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const getCooldownSecondsLeft = (lastSentAt) => {
  if (!lastSentAt) return 0;
  const secondsPassed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - secondsPassed));
};

module.exports = {
  OTP_EXPIRY_MINUTES,
  MAX_OTP_ATTEMPTS,
  generateOtp,
  hashOtp,
  isOtpMatch,
  getCooldownSecondsLeft,
};