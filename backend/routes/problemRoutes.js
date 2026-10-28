// routes/problemRoutes.js
// This file defines the URL paths for problem-related actions

const express = require('express');
const { getProblems, createProblem, getAvailableSheets } = require('../controllers/problemController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

// GET distinct sheet names — placed before "/" so it doesn't get swallowed by any broader route pattern
router.get('/sheets', getAvailableSheets);

// GET request to fetch all problems (with optional filters via query params)
router.get('/', getProblems);

// POST request to create a new custom problem — must be logged in
router.post('/', protect, createProblem);

module.exports = router;