const logger = require('./logger');

const sendOtpSms = async (phone, otp) => {
  if (!process.env.SMS_API_KEY) {
    logger.warn(`SMS not configured — OTP for ${phone}: ${otp}`);
    return;
  }
  // TODO: integrate SMS provider (e.g. Twilio, MSG91) using SMS_API_KEY + SMS_SENDER_ID
  throw new Error('SMS provider not configured');
};

module.exports = { sendOtpSms };
