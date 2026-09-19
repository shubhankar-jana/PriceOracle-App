/**
 * actualPriceBackfiller.js
 * Nightly cron job that fills in actualPrice for past predictions.
 *
 * For every Prediction where targetDate <= now and actualPrice is null,
 * it fetches the real closing price from the ML API /history endpoint
 * and writes it back to the Prediction document.
 *
 * This powers the "Actual vs Predicted" chart on the Asset Detail page.
 */

const cron = require('node-cron');
const Prediction = require('../models/Prediction');
const mlBridge = require('../services/mlBridge');

/**
 * Fill actualPrice for all past-due predictions that are missing it.
 */
const backfillActualPrices = async () => {
  console.log('[ActualPriceBackfiller] Starting backfill run...');

  try {
    const cutoff = new Date();
    // Find predictions whose target date has passed and actualPrice is not yet set
    const pendingPredictions = await Prediction.find({
      targetDate: { $lte: cutoff },
      actualPrice: null,
      predictedPrice: { $ne: null },
    }).lean();

    if (pendingPredictions.length === 0) {
      console.log('[ActualPriceBackfiller] No pending predictions to fill.');
      return;
    }

    console.log(`[ActualPriceBackfiller] Found ${pendingPredictions.length} predictions to fill.`);

    // Group predictions by symbol so we only fetch history once per symbol
    const bySymbol = {};
    for (const pred of pendingPredictions) {
      if (!bySymbol[pred.symbol]) bySymbol[pred.symbol] = [];
      bySymbol[pred.symbol].push(pred);
    }

    let totalFilled = 0;

    for (const [symbol, preds] of Object.entries(bySymbol)) {
      try {
        // Fetch 1 year of history for this symbol so we have all target dates covered
        const histData = await mlBridge.getHistory(symbol, '1y');
        if (!histData || !histData.history || histData.history.length === 0) {
          console.warn(`[ActualPriceBackfiller] No history returned for ${symbol}`);
          continue;
        }

        // Build a date → close price map (YYYY-MM-DD keys)
        const closePriceMap = {};
        for (const h of histData.history) {
          const dateKey = typeof h.date === 'string'
            ? h.date.slice(0, 10)
            : new Date(h.date).toISOString().slice(0, 10);
          closePriceMap[dateKey] = h.close;
        }

        // Update each prediction that has a matching date
        for (const pred of preds) {
          const targetKey = pred.targetDate
            ? new Date(pred.targetDate).toISOString().slice(0, 10)
            : null;

          if (!targetKey) continue;

          // Try exact date first, then look for the nearest trading day within ±2 days
          let actualClose = closePriceMap[targetKey];
          if (!actualClose) {
            for (let offset = 1; offset <= 2; offset++) {
              const d1 = new Date(pred.targetDate);
              d1.setDate(d1.getDate() + offset);
              const k1 = d1.toISOString().slice(0, 10);
              const d2 = new Date(pred.targetDate);
              d2.setDate(d2.getDate() - offset);
              const k2 = d2.toISOString().slice(0, 10);
              if (closePriceMap[k1]) { actualClose = closePriceMap[k1]; break; }
              if (closePriceMap[k2]) { actualClose = closePriceMap[k2]; break; }
            }
          }

          if (actualClose) {
            await Prediction.findByIdAndUpdate(pred._id, { actualPrice: actualClose });
            totalFilled++;
          }
        }

        console.log(`[ActualPriceBackfiller] Filled prices for ${symbol}`);
      } catch (symErr) {
        console.error(`[ActualPriceBackfiller] Error processing ${symbol}:`, symErr.message);
      }
    }

    console.log(`[ActualPriceBackfiller] Done. Filled ${totalFilled} predictions.`);
  } catch (error) {
    console.error('[ActualPriceBackfiller] Fatal error:', error.message);
  }
};

/**
 * Initialize the nightly backfiller cron job.
 * Runs at 01:00 AM every night.
 * Also runs once on startup to immediately backfill any pending predictions.
 */
const init = async () => {
  // Run once right away
  await backfillActualPrices();

  // Then schedule nightly at 1am
  cron.schedule('0 1 * * *', backfillActualPrices);
  console.log('[ActualPriceBackfiller] Nightly cron scheduled (01:00 AM daily).');
};

module.exports = { init, backfillActualPrices };
