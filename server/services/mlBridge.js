const axios = require('axios');
const config = require('../config/env');

const mlClient = axios.create({
  baseURL: config.ML_API_URL,
  timeout: 120000, // 2 minutes — ML predictions can take time
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Force axios to always parse the response as JSON regardless of Content-Type header.
  // This prevents issues where a reverse proxy (e.g. Render's nginx) may strip or
  // change the Content-Type, causing axios to return the raw string instead of a parsed object.
  transformResponse: [
    (data) => {
      if (typeof data === 'string') {
        try { return JSON.parse(data); }
        catch { return data; }
      }
      return data;
    },
  ],
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
 * Safely encode a ticker symbol for use in a URL path segment.
 * Symbols like GC=F, SI=F, EURUSD=X contain '=' which must be percent-encoded
 * or nginx/proxies will silently strip it, turning 'GC=F' into 'GCF'.
 */
const encodeSymbol = (symbol) => encodeURIComponent(symbol);

/**
 * Get prediction for a specific symbol.
 */
const getPrediction = async (symbol, task = 'regression') => {
  const response = await mlClient.get(`/predict/${encodeSymbol(symbol)}`, {
    params: { task },
  });
  return response.data;
};

/**
 * Get predictions for all tracked assets.
 */
const getAllPredictions = async (task = 'regression') => {
  const response = await mlClient.get('/predict/all', {
    params: { task },
  });
  return response.data;
};

/**
 * Get latest prices for all tracked assets.
 */
const getLatestPrices = async () => {
  const response = await mlClient.get('/latest-prices');
  return response.data;
};

/**
 * Get list of supported assets from ML API.
 */
const getAssets = async () => {
  const response = await mlClient.get('/assets');
  return response.data;
};

/**
 * Check ML API health status.
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
 * Symbol MUST be percent-encoded in the path — '=' in GC=F would be silently
 * dropped by proxies if sent as a raw character.
 */
const getHistory = async (symbol, period = '3mo') => {
  const response = await mlClient.get(`/history/${encodeSymbol(symbol)}`, {
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
