const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

/**
 * Generate a JWT access token for a user.
 * @param {string} userId - The user's MongoDB _id.
 * @returns {string} Signed JWT token.
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

/**
 * Generate a JWT refresh token for a user.
 * @param {string} userId - The user's MongoDB _id.
 * @returns {string} Signed JWT refresh token.
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRE,
  });
};

/**
 * Generate a 6-digit numeric OTP code.
 * @returns {string} 6-digit OTP string.
 */
const generateOTPCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Format a price to 2 decimal places.
 * @param {number} price - The price value.
 * @returns {string} Formatted price string.
 */
const formatPrice = (price) => {
  if (price == null || isNaN(price)) return '0.00';
  return Number(price).toFixed(2);
};

/**
 * Sanitize and normalize a ticker symbol.
 * @param {string} symbol - Raw symbol string.
 * @returns {string} Uppercased, trimmed symbol.
 */
const sanitizeSymbol = (symbol) => {
  if (!symbol) return '';
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9._=\-]/g, '');
};

module.exports = {
  generateToken,
  generateRefreshToken,
  generateOTPCode,
  formatPrice,
  sanitizeSymbol,
};
