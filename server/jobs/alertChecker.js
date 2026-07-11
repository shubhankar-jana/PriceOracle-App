const cron = require('node-cron');
const Alert = require('../models/Alert');
const Asset = require('../models/Asset');
const { sendAlertNotification } = require('../services/notificationService');

let io = null;

/**
 * Initialize the alert checker cron job.
 * Runs every 15 minutes to check if any alerts should be triggered.
 * @param {object} socketIO - Socket.IO server instance.
 */
const init = (socketIO) => {
  io = socketIO;

  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Alert Checker] Checking active alerts...');

    try {
      // Get all active, untriggered alerts
      const alerts = await Alert.find({ isActive: true, isTriggered: false });

      if (alerts.length === 0) {
        console.log('[Alert Checker] No active alerts to check');
        return;
      }

      // Get unique symbols from alerts
      const symbols = [...new Set(alerts.map((a) => a.symbol))];

      // Fetch current prices for those symbols
      const assets = await Asset.find({ symbol: { $in: symbols } });
      const priceMap = new Map(assets.map((a) => [a.symbol, a]));

      let triggeredCount = 0;

      for (const alert of alerts) {
        const asset = priceMap.get(alert.symbol);
        if (!asset || !asset.currentPrice) continue;

        let shouldTrigger = false;

        switch (alert.alertType) {
          case 'above':
            shouldTrigger = asset.currentPrice >= alert.targetPrice;
            break;
          case 'below':
            shouldTrigger = asset.currentPrice <= alert.targetPrice;
            break;
          case 'percent_change':
            shouldTrigger =
              Math.abs(asset.changePercent24h) >= alert.percentThreshold;
            break;
        }

        if (shouldTrigger) {
          // Mark alert as triggered
          alert.isTriggered = true;
          alert.triggeredAt = new Date();
          await alert.save();

          triggeredCount++;

          // Send push notification
          try {
            await sendAlertNotification(alert.userId, alert);
          } catch (notifError) {
            console.error(`[Alert Checker] Notification failed for alert ${alert._id}:`, notifError.message);
          }

          // Emit Socket.IO event
          if (io) {
            io.to(`user:${alert.userId}`).emit('alertTriggered', {
              alert: alert.toObject(),
              currentPrice: asset.currentPrice,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      if (triggeredCount > 0) {
        console.log(`[Alert Checker] Triggered ${triggeredCount} alerts`);
      } else {
        console.log('[Alert Checker] No alerts triggered');
      }
    } catch (error) {
      console.error('[Alert Checker] Cron job failed:', error.message);
    }
  });

  console.log('[Alert Checker] Cron job scheduled (every 15 minutes)');
};

module.exports = { init };
