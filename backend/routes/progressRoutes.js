// routes/progressRoutes.js
// Defines URL paths for progress-related actions.
// Every route here requires a valid auth token (protect middleware) since
// progress is always scoped to a specific logged-in user.

const express = require('express');
const {
  getUserProgress,
  markProblemDone,
  markProblemUndone,
  markCantRecall,
  updateNotes,
  getDueToday,
  getRevisionSchedule,
  selectSheet,
  hideSheet,
  resetProgress,
  getStats,
} = require('../controllers/progressController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getUserProgress);

router.get('/due-today', protect, getDueToday);

router.get('/revisions', protect, getRevisionSchedule);

router.get('/stats', protect, getStats);

router.post('/select-sheet', protect, selectSheet);

router.post('/reset', protect, resetProgress);

router.patch('/sheet/:sheetName/hide', protect, hideSheet);

router.patch('/:problemId/done', protect, markProblemDone);

router.patch('/:problemId/undone', protect, markProblemUndone);

router.patch('/:problemId/cant-recall', protect, markCantRecall);

router.patch('/:problemId/notes', protect, updateNotes);

module.exports = router;