const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Asset = require('../models/Asset');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// ============================================================
// GET /api/user/profile
// ============================================================
router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -refreshToken');

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PUT /api/user/profile
// ============================================================
router.put(
  '/profile',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { name, email, phone, notificationPrefs } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (email) updates.email = email;
      if (phone) updates.phone = phone;
      if (notificationPrefs) updates.notificationPrefs = notificationPrefs;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-passwordHash -refreshToken');

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// PUT /api/user/change-password
// ============================================================
router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Update password
      user.passwordHash = newPassword; // Pre-save hook will hash
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET /api/user/watchlist
// ============================================================
router.get('/watchlist', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const watchlist = user.watchlist || [];

    // Get current prices for watchlist items
    let assets = [];
    if (watchlist.length > 0) {
      assets = await Asset.find({ symbol: { $in: watchlist } });
    }

    res.json({
      success: true,
      data: {
        watchlist,
        assets,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/user/watchlist
// ============================================================
router.post(
  '/watchlist',
  [
    body('symbol').trim().notEmpty().withMessage('Symbol is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const symbol = req.body.symbol.toUpperCase();

      const user = await User.findById(req.user._id);
      if (user.watchlist.includes(symbol)) {
        return res.status(409).json({
          success: false,
          message: `${symbol} is already in your watchlist`,
        });
      }

      user.watchlist.push(symbol);
      await user.save();

      res.json({
        success: true,
        message: `${symbol} added to watchlist`,
        data: { watchlist: user.watchlist },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// DELETE /api/user/watchlist/:symbol
// ============================================================
router.delete('/watchlist/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const user = await User.findById(req.user._id);
    const index = user.watchlist.indexOf(symbol);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: `${symbol} is not in your watchlist`,
      });
    }

    user.watchlist.splice(index, 1);
    await user.save();

    res.json({
      success: true,
      message: `${symbol} removed from watchlist`,
      data: { watchlist: user.watchlist },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/user/push-subscription
// ============================================================
router.post('/push-subscription', async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Valid push subscription object is required',
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      pushSubscription: subscription,
    });

    res.json({
      success: true,
      message: 'Push subscription saved successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
