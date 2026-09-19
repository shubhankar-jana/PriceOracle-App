/**
 * modelRetrainer.js
 * Weekly cron job that triggers the ML API to retrain all models
 * on fresh data. This keeps the ML predictions accurate over time.
 *
 * Runs every Sunday at 02:00 AM.
 */

const cron = require('node-cron');
const mlBridge = require('../services/mlBridge');
const axios = require('axios');
const config = require('../config/env');

/**
 * Trigger a full model retrain via the ML API.
 */
const triggerRetrain = async () => {
  console.log('[ModelRetrainer] Triggering ML model retrain for all assets...');
  try {
    const response = await axios.post(`${config.ML_API_URL}/retrain/all`, {}, {
      timeout: 10000, // Just wait for the API to acknowledge start (it runs in background)
    });
    console.log('[ModelRetrainer] Retrain triggered:', response.data?.message || 'started');
    return { success: true, message: response.data?.message };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.warn('[ModelRetrainer] ML API is offline — skipping retrain.');
    } else {
      console.error('[ModelRetrainer] Failed to trigger retrain:', error.message);
    }
    return { success: false, error: error.message };
  }
};

/**
 * Initialize the weekly retrainer cron job.
 * Runs every Sunday at 02:00 AM.
 */
const init = () => {
  cron.schedule('0 2 * * 0', triggerRetrain);
  console.log('[ModelRetrainer] Weekly retrain cron scheduled (Sundays at 02:00 AM).');
};

module.exports = { init, triggerRetrain };
