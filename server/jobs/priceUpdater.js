const cron = require('node-cron');
const priceService = require('../services/priceService');

let io = null;

/**
 * Initialize the price updater cron job.
 * Runs every hour to fetch and store latest prices.
 * @param {object} socketIO - Socket.IO server instance.
 */
const init = (socketIO) => {
  io = socketIO;

  // Run every 3 minutes
  cron.schedule('*/3 * * * *', async () => {
    console.log('[Price Updater] Running scheduled price update...');

    try {
      const result = await priceService.updatePrices();

      if (result.success && io && result.updated > 0) {
        io.emit('priceUpdate', {
          timestamp: new Date().toISOString(),
          updated: result.updated,
          prices: result.data,
        });
        console.log(`[Price Updater] Emitted priceUpdate for ${result.updated} assets`);
      }
    } catch (error) {
      console.warn('[Price Updater] Price update cycle warning:', error.message);
    }
  });

  console.log('[Price Updater] Cron job scheduled (every 3 minutes)');
};

module.exports = { init };
