const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// General API rate limiter: 2000 in dev, 1000 in prod per 15 mins (allows live polling & multi-page navigation)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

// Auth rate limiter: 300 in dev, 150 in prod per 15 mins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 300 : 150,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

module.exports = { generalLimiter, authLimiter };

