const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Prediction = require('../models/Prediction');
const auth = require('../middleware/auth');
const mlBridge = require('../services/mlBridge');
const { sanitizeSymbol } = require('../utils/helpers');

// All routes require authentication
router.use(auth);

// ============================================================
// GET /api/assets
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category) {
      filter.category = category.toLowerCase();
    }

    const assets = await Asset.find(filter).sort({ category: 1, symbol: 1 });

    res.json({
      success: true,
      data: {
        count: assets.length,
        assets,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/assets/:symbol
// ============================================================
router.get('/:symbol', async (req, res, next) => {
  try {
    const symbol = sanitizeSymbol(req.params.symbol);

    const asset = await Asset.findOne({ symbol });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `Asset '${symbol}' not found`,
      });
    }

    // Get recent predictions for this asset
    const predictions = await Prediction.find({ symbol })
      .sort({ predictionDate: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        asset,
        predictions,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/assets/:symbol/history
// ============================================================
router.get('/:symbol/history', async (req, res, next) => {
  try {
    const symbol = sanitizeSymbol(req.params.symbol);
    const { period = '1m' } = req.query;

    const validPeriods = ['1d', '1w', '1m', '3m', '6m', '1y', '5y'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period. Valid options: ${validPeriods.join(', ')}`,
      });
    }

    // Try to get historical data from ML API
    try {
      const historyData = await mlBridge.getHistory(symbol, period);
      
      if (historyData && historyData.history && historyData.history.length > 0) {
        return res.json({
          success: true,
          data: {
            symbol,
            period,
            history: historyData.history,
          },
        });
      }
    } catch (mlError) {
      console.warn(`[Assets Route] ML API unavailable for history: ${mlError.message}`);
    }

    // Fallback: return whatever we have stored
    const asset = await Asset.findOne({ symbol });
    res.json({
      success: true,
      data: {
        symbol,
        period,
        history: asset ? [{
          date: asset.lastUpdated ? asset.lastUpdated.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          open: asset.latestOHLCV?.open || 0,
          high: asset.latestOHLCV?.high || 0,
          low: asset.latestOHLCV?.low || 0,
          close: asset.currentPrice || 0,
          volume: asset.latestOHLCV?.volume || 0,
        }] : [],
        message: 'Limited history available. ML API may be offline.',
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
