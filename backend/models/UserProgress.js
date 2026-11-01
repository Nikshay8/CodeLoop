// models/UserProgress.js
// This file tracks each user's individual progress on each problem


const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  // Which user this progress belongs to (reference to User model)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Which problem this progress is tracking (reference to Problem model)
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true,
  },
  // Has the user solved this at least once?
  status: {
    type: String,
    enum: ['not_done', 'done'],
    default: 'not_done',
  },

  solvedDates: {
    type: [Date], // an array of dates
    default: [],
  },
 
  revisionCount: {
    type: Number,
    default: 0,
  },
 
  lapses: {
    type: Number,
    default: 0,
  },
  // The next date this problem is due for revision
  nextRevisionDate: {
    type: Date,
    default: null,
  },
  // Persistent notes — user's approach, complexity, tricks (keeps growing, never overwritten)
  notes: {
    type: String,
    default: '',
  },
 
  archived: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

module.exports = UserProgress;