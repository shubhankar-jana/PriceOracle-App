const axios = require('axios');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const historyCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch real historical daily OHLCV prices directly from Yahoo Finance chart v8 API.
 * @param {string} symbol - Instrument symbol (e.g. BTC-USD, AAPL, GC=F, RELIANCE.NS)
 * @param {string} period - '1d', '1w', '1m', '3m', '6m', '1y', '5y'
 * @returns {Promise<Array>} Array of { date, open, high, low, close, volume }
 */
const getHistoricalPrices = async (symbol, period = '1m') => {
  const rangeMap = {
    '1d': '5d',
    '1w': '1mo',
    '1m': '1mo',
    '3m': '3mo',
    '6m': '6mo',
    '1y': '1y',
    '5y': '5y',
  };
  const range = rangeMap[period] || period || '1mo';
  const cacheKey = `${symbol.toUpperCase()}_${range}`;

  const cached = historyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const encodedSymbol = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=${range}&interval=1d`;

  let lastError = null;
  // Up to 3 attempts with brief backoff on 429
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const userAgent = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json, text/plain, */*',
        },
        timeout: 10000,
      });

      const result = response.data?.chart?.result?.[0];
      if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
        throw new Error(`No chart data returned from Yahoo API for ${symbol}`);
      }

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const volumes = quote.volume || [];

      const history = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] == null) continue;
        const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        const closePrice = Number(closes[i].toFixed(4));
        const openPrice = opens[i] != null ? Number(opens[i].toFixed(4)) : closePrice;
        const highPrice = highs[i] != null ? Number(highs[i].toFixed(4)) : closePrice;
        const lowPrice = lows[i] != null ? Number(lows[i].toFixed(4)) : closePrice;
        const volumeVal = volumes[i] != null ? Math.round(volumes[i]) : 0;

        history.push({
          date: dateStr,
          open: openPrice,
          high: highPrice,
          low: lowPrice,
          close: closePrice,
          volume: volumeVal,
        });
      }

      if (history.length > 0) {
        historyCache.set(cacheKey, { timestamp: Date.now(), data: history });
        return history;
      }
      throw new Error(`Empty history for ${symbol}`);
    } catch (err) {
      lastError = err;
      if (err.response?.status === 429 && attempt < 3) {
        // Pause 400ms before retrying with next User-Agent
        await new Promise(resolve => setTimeout(resolve, 400 * attempt));
        continue;
      }
      break;
    }
  }

  console.warn(`[Yahoo Direct API] History fetch notice for ${symbol}:`, lastError?.message || 'Failed');
  if (cached) return cached.data;
  throw lastError || new Error(`Failed to fetch history for ${symbol}`);
};

module.exports = { getHistoricalPrices };
