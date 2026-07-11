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
    console.error('[Price Service] Update failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sync asset list from the ML API.
 * Creates new Asset documents for any new symbols.
 * @returns {Promise<object>} Sync results.
 */
const syncAssets = async () => {
  try {
    const assetData = await mlBridge.getAssets();

    if (!assetData || !assetData.assets) {
      return { success: false, message: 'No asset data received' };
    }

    let created = 0;
    let updated = 0;
    for (const asset of assetData.assets) {
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
    console.error('[Price Service] Asset sync failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { updatePrices, syncAssets };
