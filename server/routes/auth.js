const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateToken, generateRefreshToken, generateOTPCode } = require('../utils/helpers');
const { authLimiter } = require('../middleware/rateLimiter');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const auth = require('../middleware/auth');

// ============================================================
// POST /api/auth/register
// Auto-verifies user — no SMS / OTP step needed
// ============================================================
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { name, email, phone, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: existingUser.email === email
            ? 'Email already registered'
            : 'Phone number already registered',
        });
      }

      // Create user — mark as verified immediately (no SMS OTP)
      const user = await User.create({
        name,
        email,
        phone,
        passwordHash: password, // pre-save hook hashes it
        isVerified: true,
      });

      // Generate tokens and log in straight away
      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      user.refreshToken = refreshToken;
      await user.save();

      const userResponse = user.toObject();
      delete userResponse.passwordHash;

      res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        data: { token, refreshToken, user: userResponse },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/login
// ============================================================
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      user.refreshToken = refreshToken;
      await user.save();

      const userResponse = user.toObject();
      delete userResponse.passwordHash;

      res.json({
        success: true,
        message: 'Login successful',
        data: { token, refreshToken, user: userResponse },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/forgot-password
// Returns reset code directly in the response (no email sent)
// ============================================================
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if email exists
        return res.json({
          success: true,
          message: 'If this email is registered, a reset code has been generated.',
        });
      }

      // Generate reset code
      const otpCode = generateOTPCode();
      await OTP.create({
        identifier: email,
        code: otpCode,
        type: 'reset',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      // Return code directly in response (no email service)
      res.json({
        success: true,
        message: 'Reset code generated. Copy it from here and use it on the next screen.',
        data: { resetCode: otpCode },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/reset-password
// ============================================================
router.post(
  '/reset-password',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email, code, newPassword } = req.body;

      const otp = await OTP.findOne({
        identifier: email,
        code,
        type: 'reset',
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });

      if (!otp) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.passwordHash = newPassword; // pre-save hook hashes it
      await user.save();

      otp.isUsed = true;
      await otp.save();

      res.json({
        success: true,
        message: 'Password reset successful. You can now log in.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/refresh-token
// ============================================================
router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { refreshToken } = req.body;

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
      } catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      }

      const user = await User.findById(decoded.id);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
      }

      const newToken = generateToken(user._id);
      res.json({ success: true, data: { token: newToken } });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', auth, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
