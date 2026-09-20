const Asset = require('../models/Asset');
const mlBridge = require('./mlBridge');

/**
 * Fetch latest prices from the ML API and update Asset documents in MongoDB.
 * Calculates change24h and changePercent24h based on previousClose.
 * @returns {Promise<object>} Update results.
 */
const updatePrices = async () => {
  try {
    console.log('[Price Service] Fetching latest prices from ML API...');
    const priceData = await mlBridge.getLatestPrices();

    if (!priceData || !priceData.prices || !Array.isArray(priceData.prices)) {
      console.warn('[Price Service] No price data received from ML API');
      return { success: false, message: 'No price data received' };
    }

    // Also fetch asset metadata (name, category) from ML API
    let assetMeta = {};
    try {
      const assetData = await mlBridge.getAssets();
      if (assetData && assetData.assets) {
        for (const a of assetData.assets) {
          assetMeta[a.symbol.toUpperCase()] = { name: a.name, category: a.category };
        }
      }
    } catch (e) {
      console.warn('[Price Service] Could not fetch asset metadata:', e.message);
    }

    const updates = [];
    const prices = priceData.prices;

    for (const data of prices) {
      if (!data.symbol) continue;
      const symbol = data.symbol.toUpperCase();
      const meta = assetMeta[symbol] || {};

      try {
        // ML API returns: price, open, high, low, volume, change, change_percent
        const currentPrice = data.price || data.close || 0;
        const previousClose = data.open || 0; // open is a good proxy for previous close for daily data
        const change24h = data.change != null ? data.change : (previousClose ? currentPrice - previousClose : 0);
        const changePercent24h = data.change_percent != null ? data.change_percent : (previousClose ? (change24h / previousClose) * 100 : 0);

        const setFields = {
          currentPrice,
          previousClose,
          change24h: Number(change24h.toFixed(4)),
          changePercent24h: Number(changePercent24h.toFixed(2)),
          latestOHLCV: {
            open: data.open || 0,
            high: data.high || 0,
            low: data.low || 0,
            close: data.price || data.close || 0,
            volume: data.volume || 0,
          },
          lastUpdated: new Date(),
        };

        // Set name and category if we have them (don't overwrite if already set)
        if (meta.name) setFields.name = meta.name;
        if (meta.category) setFields.category = meta.category;

        await Asset.findOneAndUpdate(
          { symbol },
          { $set: setFields },
          { upsert: false, new: true } // Don't upsert — only update existing assets that were properly synced
        );

        updates.push({ symbol, price: currentPrice, change: changePercent24h });
      } catch (error) {
        console.error(`[Price Service] Failed to update ${symbol}:`, error.message);
      }
    }

    console.log(`[Price Service] Updated ${updates.length} assets`);
    return { success: true, updated: updates.length, data: updates };
  } catch (error) {
    console.warn('[Price Service] Price update notice:', error.message);
    return { success: false, error: error.message };
  }
};

const DEFAULT_ASSETS = [
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'stock' },
  { symbol: 'GOOG', name: 'Alphabet Inc.', category: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'stock' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', category: 'stock' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', category: 'stock' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd.', category: 'stock' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', category: 'stock' },
  { symbol: 'GC=F', name: 'Gold Futures', category: 'commodity' },
  { symbol: 'SI=F', name: 'Silver Futures', category: 'commodity' },
  { symbol: 'CL=F', name: 'Crude Oil (WTI)', category: 'commodity' },
  { symbol: 'BTC-USD', name: 'Bitcoin USD', category: 'crypto' },
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index', category: 'index' },
  { symbol: 'USDINR=X', name: 'USD/INR', category: 'currency' },
  { symbol: 'EURUSD=X', name: 'EUR/USD', category: 'currency' },
  { symbol: 'GBPUSD=X', name: 'GBP/USD', category: 'currency' },
  { symbol: 'USDJPY=X', name: 'USD/JPY', category: 'currency' },
  { symbol: 'AUDUSD=X', name: 'AUD/USD', category: 'currency' },
  { symbol: 'USDCAD=X', name: 'USD/CAD', category: 'currency' },
  { symbol: 'USDCHF=X', name: 'USD/CHF', category: 'currency' },
  { symbol: 'USDCNY=X', name: 'USD/CNY', category: 'currency' },
  { symbol: 'NZDUSD=X', name: 'NZD/USD', category: 'currency' },
  { symbol: 'USDSGD=X', name: 'USD/SGD', category: 'currency' },
];

/**
 * Sync asset list from the ML API (or fallback asset definitions).
 * Creates new Asset documents for any new symbols.
 * @returns {Promise<object>} Sync results.
 */
const syncAssets = async () => {
  let assetList = DEFAULT_ASSETS;

  try {
    const assetData = await mlBridge.getAssets();
    if (assetData && Array.isArray(assetData.assets) && assetData.assets.length > 0) {
      assetList = assetData.assets;
    }
  } catch (bridgeErr) {
    console.warn('[Price Service] Using built-in asset catalog:', bridgeErr.message);
  }

  try {
    let created = 0;
    let updated = 0;
    for (const asset of assetList) {
      const sym = asset.symbol.toUpperCase();
      const result = await Asset.findOneAndUpdate(
        { symbol: sym },
        {
          $set: { name: asset.name, category: asset.category },
          $setOnInsert: { currentPrice: 0, changePercent24h: 0, change24h: 0 }
        },
        { upsert: true, new: true }
      );
      if (result.createdAt && new Date() - result.createdAt < 3000) created++;
      else updated++;
    }

    console.log(`[Price Service] Synced assets. Created: ${created}, Updated: ${updated}`);
    return { success: true, created, updated };
  } catch (error) {
    console.warn('[Price Service] Asset sync notice:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { updatePrices, syncAssets };
