const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  githubUrl: {
    type: String,
    default: '',
  },
  leetcodeUsername: {
    type: String,
    default: '',
  },
  isVerified: {
    type: Boolean,
    default: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true,
  },
  otpHash: {
    type: String,
    select: false,
  },
  otpExpiresAt: {
    type: Date,
    select: false,
  },
  otpAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  otpLastSentAt: {
    type: Date,
    select: false,
  },
  passwordChangedAt: {
    type: Date,
    select: false,
  },
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;