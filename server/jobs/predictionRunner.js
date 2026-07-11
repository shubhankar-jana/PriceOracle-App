const cron = require('node-cron');
const mlBridge = require('../services/mlBridge');
const Prediction = require('../models/Prediction');

let io = null;

/**
 * Save predictions from ML API result to MongoDB.
 * Handles both snake_case (ML API) and camelCase field names.
 */
const savePredictions = async (mlResults, task) => {
  if (!mlResults || !mlResults.predictions) return 0;

  let saved = 0;
  for (const pred of mlResults.predictions) {
    if (pred.error) continue;
    try {
      // ML API may return either snake_case or camelCase field names
      const predictedPrice = pred.predicted_price || pred.predictedPrice || null;
      const confidence = pred.confidence || null;
      const direction = pred.direction || null;
      const modelName = pred.model_name || pred.modelName || 'TechnicalAnalysis';
      const targetDate = pred.target_date || pred.targetDate || null;

      await Prediction.create({
        symbol: pred.symbol,
        predictionDate: new Date(),
        targetDate: targetDate ? new Date(targetDate) : undefined,
        predictedPrice,
        confidence,
        direction,
        modelName,
        task,
        metrics: pred.metrics || {},
      });

      if (io) {
        io.to(pred.symbol).emit('newPrediction', { symbol: pred.symbol });
      }
      saved++;
    } catch (saveError) {
      // Ignore duplicate key errors (same symbol predicted twice in a session)
      if (saveError.code !== 11000) {
        console.error(`[Prediction Runner] Failed to save prediction for ${pred.symbol}:`, saveError.message);
      }
    }
  }
  return saved;
};

/**
 * Run predictions for all assets and save to DB.
 */
const runPredictions = async () => {
  console.log('[Prediction Runner] Running prediction cycle...');
  try {
    const [regressionResult, directionResult] = await Promise.allSettled([
      mlBridge.getAllPredictions('regression'),
      mlBridge.getAllPredictions('direction'),
    ]);

    let total = 0;
    if (regressionResult.status === 'fulfilled') {
      total += await savePredictions(regressionResult.value, 'regression');
      console.log(`[Prediction Runner] Saved ${total} regression predictions`);
    } else {
      console.warn('[Prediction Runner] Regression predictions failed:', regressionResult.reason?.message);
    }

    if (directionResult.status === 'fulfilled') {
      const dTotal = await savePredictions(directionResult.value, 'direction');
      console.log(`[Prediction Runner] Saved ${dTotal} direction predictions`);
    } else {
      console.warn('[Prediction Runner] Direction predictions failed:', directionResult.reason?.message);
    }

    if (io) {
      io.emit('predictionsUpdated', { timestamp: new Date().toISOString() });
    }
    return { success: true, saved: total };
  } catch (error) {
    console.error('[Prediction Runner] Prediction cycle failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Initialize the prediction runner cron job.
 * Runs every 6 hours to generate predictions for all assets.
 * @param {object} socketIO - Socket.IO server instance.
 */
const init = async (socketIO) => {
  io = socketIO;

  // Run immediately on startup to populate predictions right away
  console.log('[Prediction Runner] Running initial predictions on startup...');
  await runPredictions();

  // Then schedule every 6 hours
  cron.schedule('0 */6 * * *', runPredictions);
  console.log('[Prediction Runner] Cron job scheduled (every 6 hours)');
};

module.exports = { init, runPredictions };
