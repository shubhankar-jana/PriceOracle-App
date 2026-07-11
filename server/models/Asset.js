const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: [true, 'Symbol is required'],
      unique: true,
      index: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
    },
    category: {
      type: String,
      enum: ['stock', 'commodity', 'crypto', 'index', 'currency'],
      required: [true, 'Category is required'],
    },
    currentPrice: {
      type: Number,
      default: 0,
    },
    previousClose: {
      type: Number,
      default: 0,
    },
    change24h: {
      type: Number,
      default: 0,
    },
    changePercent24h: {
      type: Number,
      default: 0,
    },
    latestOHLCV: {
      open: { type: Number },
      high: { type: Number },
      low: { type: Number },
      close: { type: Number },
      volume: { type: Number },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Asset', assetSchema);
