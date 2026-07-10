const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: [true, 'Identifier (phone or email) is required'],
  },
  code: {
    type: String,
    required: [true, 'OTP code is required'],
  },
  type: {
    type: String,
    enum: ['register', 'reset'],
    required: [true, 'OTP type is required'],
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('OTP', otpSchema);
