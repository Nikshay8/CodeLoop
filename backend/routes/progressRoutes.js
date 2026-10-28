// routes/progressRoutes.js
// Defines URL paths for progress-related actions.
// Every route here requires a valid auth token (protect middleware) since
// progress is always scoped to a specific logged-in user.

const express = require('express');
const {
  getUserProgress,
  markProblemDone,
  markProblemUndone,
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

// GET all visible (not hidden) progress entries for the logged-in user
router.get('/', protect, getUserProgress);

// GET problems due for revision today
router.get('/due-today', protect, getDueToday);

// GET the full revision schedule (due now + upcoming)
router.get('/revisions', protect, getRevisionSchedule);

// GET stats for the dashboard (heatmap + topic-wise progress)
router.get('/stats', protect, getStats);

// POST select a sheet — creates entries for new problems and restores hidden ones
router.post('/select-sheet', protect, selectSheet);

// POST reset progress of everything currently visible (notes are kept)
router.post('/reset', protect, resetProgress);

// PATCH hide a sheet — progress and notes are kept, only the sheet disappears from view
// (replaces the old DELETE /sheet/:sheetName that erased the progress)
router.patch('/sheet/:sheetName/hide', protect, hideSheet);

// PATCH mark a specific problem as solved/revised (creates or updates the progress entry)
router.patch('/:problemId/done', protect, markProblemDone);

// PATCH mark a specific problem as NOT solved ("untick")
router.patch('/:problemId/undone', protect, markProblemUndone);

// PATCH save notes for a specific problem
router.patch('/:problemId/notes', protect, updateNotes);

module.exports = router;