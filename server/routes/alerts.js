const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// All routes require authentication
router.use(auth);

// ============================================================
// GET /api/alerts
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        count: alerts.length,
        alerts,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/alerts
// ============================================================
router.post(
  '/',
  [
    body('symbol').trim().notEmpty().withMessage('Symbol is required'),
    body('alertType')
      .isIn(['above', 'below', 'percent_change'])
      .withMessage('Alert type must be: above, below, or percent_change'),
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

      const { symbol, alertType, targetPrice, percentThreshold } = req.body;

      // Validate that the right price field is provided
      if (alertType !== 'percent_change' && !targetPrice) {
        return res.status(400).json({
          success: false,
          message: 'targetPrice is required for above/below alerts',
        });
      }

      if (alertType === 'percent_change' && !percentThreshold) {
        return res.status(400).json({
          success: false,
          message: 'percentThreshold is required for percent_change alerts',
        });
      }

      const alert = await Alert.create({
        userId: req.user._id,
        symbol: symbol.toUpperCase(),
        alertType,
        targetPrice,
        percentThreshold,
      });

      res.status(201).json({
        success: true,
        message: 'Alert created successfully',
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// PUT /api/alerts/:id
// ============================================================
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetPrice, percentThreshold, isActive } = req.body;

    const alert = await Alert.findOne({ _id: id, userId: req.user._id });
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    if (targetPrice !== undefined) alert.targetPrice = targetPrice;
    if (percentThreshold !== undefined) alert.percentThreshold = percentThreshold;
    if (isActive !== undefined) alert.isActive = isActive;

    await alert.save();

    res.json({
      success: true,
      message: 'Alert updated successfully',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DELETE /api/alerts/:id
// ============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found or already deleted',
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
