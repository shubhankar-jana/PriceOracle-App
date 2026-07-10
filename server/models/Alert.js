const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
  },
  alertType: {
    type: String,
    enum: ['above', 'below', 'percent_change'],
    required: [true, 'Alert type is required'],
  },
  targetPrice: {
    type: Number,
  },
  percentThreshold: {
    type: Number,
  },
  isTriggered: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  triggeredAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Alert', alertSchema);
