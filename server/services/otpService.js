const { generateOTPCode } = require('../utils/helpers');

/**
 * Generate a 6-digit OTP code.
 * @returns {string} 6-digit OTP.
 */
const generateOTP = () => {
  return generateOTPCode();
};

module.exports = { generateOTP };
