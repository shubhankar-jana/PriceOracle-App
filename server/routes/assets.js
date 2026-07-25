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

    let assets = await Asset.find(filter).sort({ category: 1, symbol: 1 });

    // If MongoDB has no assets (cold start / first deploy), sync from ML API on-demand
    if (assets.length === 0) {
      console.log('[Assets Route] No assets in DB — running on-demand sync...');
      try {
        const assetData = await mlBridge.getAssets();
        if (assetData && assetData.assets && assetData.assets.length > 0) {
          for (const a of assetData.assets) {
            const sym = a.symbol.toUpperCase();
            await Asset.findOneAndUpdate(
              { symbol: sym },
              {
                $set: { name: a.name, category: a.category },
                $setOnInsert: { currentPrice: 0, changePercent24h: 0, change24h: 0 },
              },
              { upsert: true, new: true }
            );
          }
          assets = await Asset.find(filter).sort({ category: 1, symbol: 1 });
          console.log(`[Assets Route] On-demand sync created ${assets.length} assets`);
        }
      } catch (syncErr) {
        console.error('[Assets Route] On-demand sync failed:', syncErr.message);
      }
    }

    res.json({
      success: true,
      data: { count: assets.length, assets },
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

    let asset = await Asset.findOne({ symbol });

    // Asset not in DB — try to create it from ML API data (handles cold-start sync failure)
    if (!asset) {
      console.log(`[Assets Route] '${symbol}' not in DB — trying ML API sync...`);
      try {
        // Get the price snapshot from ML API which has current price + OHLCV
        const priceData = await mlBridge.getLatestPrices();
        const prices = Array.isArray(priceData?.prices) ? priceData.prices : [];
        const priceEntry = prices.find(p => p.symbol?.toUpperCase() === symbol);

        // Also get name/category from /assets endpoint
        const assetList = await mlBridge.getAssets();
        const assetInfo = (assetList?.assets || []).find(a => a.symbol?.toUpperCase() === symbol);

        if (assetInfo || priceEntry) {
          asset = await Asset.findOneAndUpdate(
            { symbol },
            {
              $set: {
                name: assetInfo?.name || symbol,
                category: assetInfo?.category || 'stock',
                currentPrice: priceEntry?.price || priceEntry?.close || 0,
                previousClose: priceEntry?.open || 0,
                change24h: priceEntry?.change || 0,
                changePercent24h: priceEntry?.change_percent || 0,
                latestOHLCV: {
                  open: priceEntry?.open || 0,
                  high: priceEntry?.high || 0,
                  low: priceEntry?.low || 0,
                  close: priceEntry?.price || priceEntry?.close || 0,
                  volume: priceEntry?.volume || 0,
                },
                lastUpdated: new Date(),
              },
            },
            { upsert: true, new: true }
          );
          console.log(`[Assets Route] Auto-created asset '${symbol}' from ML API`);
        }
      } catch (syncErr) {
        console.warn(`[Assets Route] Auto-sync failed for '${symbol}':`, syncErr.message);
      }
    }

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `Asset '${symbol}' not found. It may not be tracked by the ML service.`,
      });
    }

    // Get recent predictions for this asset
    const predictions = await Prediction.find({ symbol })
      .sort({ predictionDate: -1 })
      .limit(10);

    res.json({
      success: true,
      data: { asset, predictions },
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

    // Translate frontend period codes → Yahoo Finance period strings used by ML API
    const periodMap = {
      '1d': '5d', '1w': '1mo', '1m': '1mo',
      '3m': '3mo', '6m': '6mo', '1y': '1y', '5y': '5y',
    };
    const mlPeriod = periodMap[period] || '1mo';

    // Try to get historical data from ML API
    try {
      const historyData = await mlBridge.getHistory(symbol, mlPeriod);

      if (historyData && historyData.history && historyData.history.length > 0) {
        return res.json({
          success: true,
          data: { symbol, period, history: historyData.history },
        });
      }
    } catch (mlError) {
      console.warn(`[Assets Route] ML API unavailable for history of '${symbol}': ${mlError.message}`);
    }

    // Fallback: return the single stored OHLCV snapshot
    const asset = await Asset.findOne({ symbol });
    res.json({
      success: true,
      data: {
        symbol,
        period,
        history: asset && asset.currentPrice > 0 ? [{
          date: asset.lastUpdated
            ? asset.lastUpdated.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          open: asset.latestOHLCV?.open || 0,
          high: asset.latestOHLCV?.high || 0,
          low: asset.latestOHLCV?.low || 0,
          close: asset.currentPrice || 0,
          volume: asset.latestOHLCV?.volume || 0,
        }] : [],
        message: 'Limited history available — ML API may be waking up.',
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
