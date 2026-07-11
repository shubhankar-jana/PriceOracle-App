const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Asset = require('../models/Asset');
const auth = require('../middleware/auth');
const mlBridge = require('../services/mlBridge');
const { sanitizeSymbol } = require('../utils/helpers');
const { generalLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(auth);

// ============================================================
// GET /api/predictions
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const { category, task } = req.query;
    const filter = {};

    if (task) {
      filter.task = task;
    }

    // If category filter, get symbols for that category first
    if (category) {
      const assets = await Asset.find({ category: category.toLowerCase() }).select('symbol');
      const symbols = assets.map((a) => a.symbol);
      filter.symbol = { $in: symbols };
    }

    // Get latest prediction per symbol — prefer regression over direction
    const predictions = await Prediction.aggregate([
      { $match: filter },
      { $addFields: { taskPriority: { $cond: { if: { $eq: ['$task', 'regression'] }, then: 0, else: 1 } } } },
      { $sort: { taskPriority: 1, predictionDate: -1 } },
      {
        $group: {
          _id: '$symbol',
          latestPrediction: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latestPrediction' } },
      { $sort: { symbol: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        count: predictions.length,
        predictions,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/predictions/:symbol
// ============================================================
router.get('/:symbol', async (req, res, next) => {
  try {
    const symbol = sanitizeSymbol(req.params.symbol);

    const predictions = await Prediction.find({ symbol })
      .sort({ predictionDate: -1 })
      .limit(50);

    // Calculate historical accuracy
    const completedPredictions = predictions.filter(
      (p) => p.actualPrice != null && p.predictedPrice != null
    );

    let accuracy = null;
    if (completedPredictions.length > 0) {
      const totalError = completedPredictions.reduce((sum, p) => {
        return sum + Math.abs(p.actualPrice - p.predictedPrice) / p.actualPrice;
      }, 0);
      accuracy = {
        mape: ((totalError / completedPredictions.length) * 100).toFixed(2),
        sampleSize: completedPredictions.length,
        directionAccuracy: null,
      };

      // Direction accuracy: compare actual direction (actual vs previous actual) with predicted direction
      const directionCorrect = completedPredictions.filter((p) => {
        const actualDir = p.actualPrice >= (p.previousClose || p.actualPrice * 0.99) ? 'up' : 'down';
        return p.direction === actualDir;
      }).length;
      accuracy.directionAccuracy = ((directionCorrect / completedPredictions.length) * 100).toFixed(2);
    }

    res.json({
      success: true,
      data: {
        symbol,
        count: predictions.length,
        predictions,
        accuracy,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/predictions/run-all — Trigger predictions for all assets
// ============================================================
router.post('/run-all', generalLimiter, async (req, res, next) => {
  try {
    const { runPredictions } = require('../jobs/predictionRunner');
    // Run in background, respond immediately
    runPredictions().catch(err => console.error('[Predictions] Background run failed:', err.message));
    res.json({ success: true, message: 'Prediction cycle started in background.' });
  } catch (error) {
    next(error);
  }
});

router.post('/run/:symbol', generalLimiter, async (req, res, next) => {
  try {
    const symbol = sanitizeSymbol(req.params.symbol);
    const { task = 'regression' } = req.body;

    // Verify asset exists
    const asset = await Asset.findOne({ symbol });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `Asset '${symbol}' not found`,
      });
    }

    // Call ML API
    let mlResult;
    try {
      mlResult = await mlBridge.getPrediction(symbol, task);
    } catch (mlError) {
      return res.status(503).json({
        success: false,
        message: 'ML prediction service is unavailable',
        error: mlError.message,
      });
    }

    // Store prediction
    const prediction = await Prediction.create({
      symbol,
      predictionDate: new Date(),
      targetDate: mlResult.targetDate ? new Date(mlResult.targetDate) : undefined,
      predictedPrice: mlResult.predictedPrice,
      confidence: mlResult.confidence,
      direction: mlResult.direction,
      modelName: mlResult.modelName,
      task,
      metrics: mlResult.metrics || {},
    });

    // Emit Socket.IO event if available
    const io = req.app.get('io');
    if (io) {
      io.to(symbol).emit('newPrediction', {
        symbol,
        prediction,
      });
    }

    res.json({
      success: true,
      message: `Prediction generated for ${symbol}`,
      data: prediction,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
