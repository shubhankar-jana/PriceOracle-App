const axios = require('axios');
const config = require('../config/env');

const mlClient = axios.create({
  baseURL: config.ML_API_URL,
  timeout: 120000, // 2 minutes — ML predictions can take time
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request/response interceptors for logging
mlClient.interceptors.request.use(
  (req) => {
    console.log(`[ML Bridge] ${req.method.toUpperCase()} ${req.baseURL}${req.url}`);
    return req;
  },
  (error) => {
    console.error('[ML Bridge] Request error:', error.message);
    return Promise.reject(error);
  }
);

mlClient.interceptors.response.use(
  (res) => {
    console.log(`[ML Bridge] Response: ${res.status} from ${res.config.url}`);
    return res;
  },
  (error) => {
    if (error.code === 'ECONNREFUSED') {
      console.error('[ML Bridge] ML API is not running at', config.ML_API_URL);
    } else {
      console.error('[ML Bridge] Response error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Get prediction for a specific symbol.
 * @param {string} symbol - Asset symbol.
 * @param {string} task - 'regression' or 'direction'.
 * @returns {Promise<object>} Prediction data.
 */
const getPrediction = async (symbol, task = 'regression') => {
  const response = await mlClient.get(`/predict/${symbol}`, {
    params: { task },
  });
  return response.data;
};

/**
 * Get predictions for all tracked assets.
 * @param {string} task - 'regression' or 'direction'.
 * @returns {Promise<object>} All predictions data.
 */
const getAllPredictions = async (task = 'regression') => {
  const response = await mlClient.get('/predict/all', {
    params: { task },
  });
  return response.data;
};

/**
 * Get latest prices for all tracked assets.
 * @returns {Promise<object>} Latest prices data.
 */
const getLatestPrices = async () => {
  const response = await mlClient.get('/latest-prices');
  return response.data;
};

/**
 * Get list of supported assets from ML API.
 * @returns {Promise<object>} Assets list.
 */
const getAssets = async () => {
  const response = await mlClient.get('/assets');
  return response.data;
};

/**
 * Check ML API health status.
 * @returns {Promise<object>} Health check response.
 */
const checkHealth = async () => {
  try {
    const response = await mlClient.get('/health');
    return { healthy: true, data: response.data };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

/**
 * Get historical price data for a specific symbol.
 * @param {string} symbol - Asset symbol.
 * @param {string} period - '1mo', '3mo', '6mo', '1y' etc.
 * @returns {Promise<object>} History data.
 */
const getHistory = async (symbol, period = '3mo') => {
  const response = await mlClient.get(`/history/${symbol}`, {
    params: { period },
  });
  return response.data;
};

module.exports = {
  getPrediction,
  getAllPredictions,
  getLatestPrices,
  getAssets,
  getHistory,
  checkHealth,
};
