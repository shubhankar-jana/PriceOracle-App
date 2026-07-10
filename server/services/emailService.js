/**
 * emailService.js — Email sending is disabled.
 * Gmail / SMTP integration has been removed.
 * Password reset codes are returned directly in the API response.
 */

const sendResetEmail = async (email, code) => {
  // No email sending — code is returned in the API response instead
  console.log(`[Auth] Password reset code for ${email}: ${code}`);
  return { success: true };
};

module.exports = { sendResetEmail };
