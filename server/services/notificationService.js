const webPush = require('web-push');
const User = require('../models/User');
const config = require('../config/env');

let isConfigured = false;

// Initialize web-push with VAPID keys if available
if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  try {
    webPush.setVapidDetails(
      config.VAPID_EMAIL,
      config.VAPID_PUBLIC_KEY,
      config.VAPID_PRIVATE_KEY
    );
    isConfigured = true;
    console.log('[Notification Service] Web Push configured with VAPID keys');
  } catch (error) {
    console.warn('[Notification Service] Failed to configure Web Push:', error.message);
  }
} else {
  console.warn('[Notification Service] VAPID keys not configured. Push notifications disabled.');
}

/**
 * Send a push notification to a specific subscription.
 * @param {object} subscription - Web Push subscription object.
 * @param {object} payload - Notification payload { title, body, icon, url }.
 * @returns {Promise<object>} Send result.
 */
const sendPushNotification = async (subscription, payload) => {
  if (!isConfigured) {
    console.log('[Notification Service] Push not configured. Payload:', JSON.stringify(payload));
    return { success: false, reason: 'not_configured' };
  }

  if (!subscription || !subscription.endpoint) {
    console.warn('[Notification Service] Invalid subscription object');
    return { success: false, reason: 'invalid_subscription' };
  }

  try {
    const result = await webPush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    console.log(`[Notification Service] Push sent: ${result.statusCode}`);
    return { success: true, statusCode: result.statusCode };
  } catch (error) {
    console.error('[Notification Service] Push failed:', error.message);
    // If subscription is expired/invalid, return specific status
    if (error.statusCode === 404 || error.statusCode === 410) {
      return { success: false, reason: 'subscription_expired', statusCode: error.statusCode };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Send an alert notification to a user by userId.
 * @param {string} userId - The user's MongoDB _id.
 * @param {object} alert - The alert document.
 * @returns {Promise<object>} Send result.
 */
const sendAlertNotification = async (userId, alert) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, reason: 'user_not_found' };
    }

    // Check if user has push notifications enabled and has a subscription
    if (!user.notificationPrefs?.push || !user.pushSubscription) {
      console.log(`[Notification Service] Push not enabled for user ${userId}`);
      return { success: false, reason: 'push_not_enabled' };
    }

    const payload = {
      title: '🔔 PriceOracle Alert',
      body: `${alert.symbol} has ${alert.alertType === 'above' ? 'risen above' : alert.alertType === 'below' ? 'fallen below' : 'changed by'} ${alert.targetPrice ? '$' + alert.targetPrice : alert.percentThreshold + '%'}`,
      icon: '/icon-192x192.png',
      url: `/asset/${alert.symbol}`,
      data: {
        alertId: alert._id,
        symbol: alert.symbol,
        alertType: alert.alertType,
      },
    };

    return await sendPushNotification(user.pushSubscription, payload);
  } catch (error) {
    console.error('[Notification Service] Alert notification failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPushNotification, sendAlertNotification };
