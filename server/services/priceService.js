const Asset = require('../models/Asset');
const mlBridge = require('./mlBridge');

/**
 * Fetch latest prices from the ML API and update Asset documents in MongoDB.
 * Uses upsert so it also creates assets that weren't synced on startup.
 * @returns {Promise<object>} Update results.
 */
const updatePrices = async () => {
  try {
    console.log('[Price Service] Fetching latest prices from ML API...');
    const priceData = await mlBridge.getLatestPrices();

    // Guard: priceData must be an object with a prices array
    if (!priceData || typeof priceData !== 'object') {
      console.warn('[Price Service] ML API returned invalid response type:', typeof priceData);
      return { success: false, message: 'Invalid response from ML API' };
    }

    const prices = Array.isArray(priceData.prices) ? priceData.prices : [];

    if (prices.length === 0) {
      const errorSummary = Array.isArray(priceData.errors)
        ? `${priceData.errors.length} errors. First: ${priceData.errors[0]?.message || 'unknown'}`
        : 'no error details';
      console.warn(`[Price Service] ML API returned 0 prices (${errorSummary}). yfinance may be unavailable.`);
      return { success: false, message: 'No prices returned by ML API' };
    }

    // Also fetch asset metadata (name, category)
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

    for (const data of prices) {
      if (!data.symbol) continue;
      const symbol = data.symbol.toUpperCase();
      const meta = assetMeta[symbol] || {};

      try {
        const currentPrice = data.price || data.close || 0;
        const previousClose = data.open || 0;
        const change24h = data.change != null ? data.change : (previousClose ? currentPrice - previousClose : 0);
        const changePercent24h = data.change_percent != null
          ? data.change_percent
          : (previousClose ? (change24h / previousClose) * 100 : 0);

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

        if (meta.name) setFields.name = meta.name;
        if (meta.category) setFields.category = meta.category;

        // upsert: true — creates the asset document if it doesn't exist yet.
        // This handles the case where syncAssets() failed on startup (ML API cold start).
        await Asset.findOneAndUpdate(
          { symbol },
          {
            $set: setFields,
            $setOnInsert: {
              name: meta.name || symbol,
              category: meta.category || 'stock',
            },
          },
          { upsert: true, new: true }
        );

        updates.push({ symbol, price: currentPrice, change: changePercent24h });
      } catch (error) {
        console.error(`[Price Service] Failed to update ${symbol}:`, error.message);
      }
    }

    console.log(`[Price Service] Updated ${updates.length} / ${prices.length} assets`);
    return { success: true, updated: updates.length, data: updates };
  } catch (error) {
    console.error('[Price Service] Update failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sync asset list from the ML API.
 * Creates new Asset documents for any new symbols.
 * @param {number} retries - Number of retries if ML API is not ready yet.
 * @returns {Promise<object>} Sync results.
 */
const syncAssets = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const assetData = await mlBridge.getAssets();

      if (!assetData || !assetData.assets || assetData.assets.length === 0) {
        console.warn(`[Price Service] Asset sync attempt ${attempt}/${retries}: empty response`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 5000 * attempt)); // wait 5s, 10s, 15s
          continue;
        }
        return { success: false, message: 'No asset data received after retries' };
      }

      let created = 0;
      let updated = 0;
      for (const asset of assetData.assets) {
        const sym = asset.symbol.toUpperCase();
        try {
          const before = await Asset.findOne({ symbol: sym });
          await Asset.findOneAndUpdate(
            { symbol: sym },
            {
              $set: { name: asset.name, category: asset.category },
              $setOnInsert: { currentPrice: 0, changePercent24h: 0, change24h: 0 },
            },
            { upsert: true, new: true }
          );
          if (!before) created++;
          else updated++;
        } catch (e) {
          console.error(`[Price Service] Failed to sync asset ${sym}:`, e.message);
        }
      }

      console.log(`[Price Service] Asset sync complete. Created: ${created}, Updated: ${updated}`);
      return { success: true, created, updated };
    } catch (error) {
      console.error(`[Price Service] Asset sync attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 5000 * attempt));
      } else {
        return { success: false, error: error.message };
      }
    }
  }
};

module.exports = { updatePrices, syncAssets };
