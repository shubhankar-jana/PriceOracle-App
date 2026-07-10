const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
    index: true,
  },
  predictionDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  targetDate: {
    type: Date,
  },
  predictedPrice: {
    type: Number,
  },
  actualPrice: {
    type: Number,
  },
  confidence: {
    type: Number,
  },
  direction: {
    type: String,
    enum: ['up', 'down'],
  },
  modelName: {
    type: String,
  },
  task: {
    type: String,
    enum: ['regression', 'direction'],
  },
  metrics: {
    rmse: { type: Number },
    mae: { type: Number },
    mape: { type: Number },
    r2: { type: Number },
    accuracy: { type: Number },
    f1: { type: Number },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient querying by symbol and date
predictionSchema.index({ symbol: 1, predictionDate: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
