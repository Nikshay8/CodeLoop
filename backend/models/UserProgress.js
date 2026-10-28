const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true,
  },
  status: {
    type: String,
    enum: ['not_done', 'done'],
    default: 'not_done',
  },
  solvedDates: {
    type: [Date],
    default: [],
  },
  revisionCount: {
    type: Number,
    default: 0,
  },
  nextRevisionDate: {
    type: Date,
    default: null,
  },
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