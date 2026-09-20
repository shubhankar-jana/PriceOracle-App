const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Prediction = require('../models/Prediction');
const auth = require('../middleware/auth');
const mlBridge = require('../services/mlBridge');
const { sanitizeSymbol } = require('../utils/helpers');

const yahooFinanceService = require('../services/yahooFinanceService');

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

    // 1. Primary: Fetch real historical data directly from Yahoo Finance v8 API (fast, 250+ real data points)
    try {
      const realHistory = await yahooFinanceService.getHistoricalPrices(symbol, period);
      if (realHistory && Array.isArray(realHistory) && realHistory.length > 1) {
        return res.json({
          success: true,
          data: {
            symbol,
            period,
            history: realHistory,
          },
        });
      }
    } catch (yfError) {
      console.warn(`[Assets Route] Direct Yahoo Finance fetch notice: ${yfError.message}`);
    }

    // 2. Secondary: Fall back to ML API history
    try {
      const historyData = await mlBridge.getHistory(symbol, period);
      if (historyData && Array.isArray(historyData.history) && historyData.history.length > 1) {
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
      console.warn(`[Assets Route] ML API history notice: ${mlError.message}`);
    }

    // 3. Fallback: Return empty history if remote APIs fail (forces clean error state with Retry button in UI)
    const asset = await Asset.findOne({ symbol });
    return res.json({
      success: false,
      data: {
        symbol,
        period,
        history: [],
      },
      message: 'Could not fetch real historical price data. Tap Retry to load.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
