// controllers/progressController.js
// Handles all progress-related operations: marking problems done/undone, the
// revision cycle, notes, and the dashboard stats.

const UserProgress = require('../models/UserProgress');
const Problem = require('../models/Problem');

const revisionGaps = [1, 3, 7, 15, 30];

// Reusable filter fragment: "only entries that are NOT hidden"
const ACTIVE_ONLY = { archived: { $ne: true } };

const FALLBACK_TIMEZONE = 'UTC';

const resolveTimeZone = (timeZone) => {
  if (typeof timeZone !== 'string' || timeZone.trim() === '') {
    return FALLBACK_TIMEZONE;
  }

  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return timeZone;
  } catch (error) {
    return FALLBACK_TIMEZONE;
  }
};


const getRequestTimeZone = (req) => resolveTimeZone(req.query.tz || req.headers['x-timezone']);


const makeDateKeyFormatter = (timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const getZonedParts = (instant, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const values = {};
  parts.forEach(({ type, value }) => {
    if (type !== 'literal') values[type] = Number(value);
  });
  return values;
};

const getTimeZoneOffsetMs = (instant, timeZone) => {
  const p = getZonedParts(instant, timeZone);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);

  // Drop milliseconds so both sides of the subtraction have whole seconds
  const instantWholeSeconds = Math.floor(instant.getTime() / 1000) * 1000;

  return wallClockAsUtc - instantWholeSeconds;
};

const getStartOfDayInTimeZone = (timeZone, daysFromToday = 0, now = new Date()) => {
  // What is today's date on the user's calendar?
  const today = getZonedParts(now, timeZone);

  const wallMidnightAsUtc = Date.UTC(today.year, today.month - 1, today.day + daysFromToday);

  const firstOffset = getTimeZoneOffsetMs(new Date(wallMidnightAsUtc), timeZone);
  let result = wallMidnightAsUtc - firstOffset;

  const secondOffset = getTimeZoneOffsetMs(new Date(result), timeZone);
  if (secondOffset !== firstOffset) {
    result = wallMidnightAsUtc - secondOffset;
  }

  return new Date(result);
};

const getUserProgress = async (req, res) => {
  try {
    const progress = await UserProgress.find({ userId: req.userId, ...ACTIVE_ONLY }).populate('problemId');
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const markProblemDone = async (req, res) => {
  try {
    const { problemId } = req.params;

    let progress = await UserProgress.findOne({ userId: req.userId, problemId });

    if (!progress) {
      progress = new UserProgress({ userId: req.userId, problemId });
    }

    progress.status = 'done';
    progress.solvedDates.push(new Date());

    progress.revisionCount += 1;

    const gapIndex = Math.min(progress.revisionCount - 1, revisionGaps.length - 1);
    const gapDays = revisionGaps[gapIndex];

    const timeZone = getRequestTimeZone(req);
    progress.nextRevisionDate = getStartOfDayInTimeZone(timeZone, gapDays);

    await progress.save();
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const markProblemUndone = async (req, res) => {
  try {
    const { problemId } = req.params;

    const progress = await UserProgress.findOne({ userId: req.userId, problemId });

    if (!progress) {
      return res.status(404).json({ message: 'No progress found for this problem' });
    }

    progress.status = 'not_done';
    progress.solvedDates = [];
    progress.revisionCount = 0;
    progress.lapses = 0;
    progress.nextRevisionDate = null;

    await progress.save();
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const markCantRecall = async (req, res) => {
  try {
    const { problemId } = req.params;

    const progress = await UserProgress.findOne({ userId: req.userId, problemId });

    if (!progress) {
      return res.status(404).json({ message: 'No progress found for this problem' });
    }

    if (progress.status !== 'done') {
      return res.status(400).json({ message: 'Only solved problems can be reset in the revision cycle' });
    }

    progress.revisionCount = 1;
    progress.lapses = (progress.lapses || 0) + 1;

    // revisionGaps[0] is the first gap (1 day) — the same gap a brand-new solve gets
    const timeZone = getRequestTimeZone(req);
    progress.nextRevisionDate = getStartOfDayInTimeZone(timeZone, revisionGaps[0]);

    await progress.save();
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const updateNotes = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { note } = req.body;

    // An empty string is allowed (the user may clear their note), but the field must be present
    if (typeof note !== 'string') {
      return res.status(400).json({ message: 'Note text is required' });
    }

    let progress = await UserProgress.findOne({ userId: req.userId, problemId });

    if (!progress) {
      // Allow writing a note before the problem has been marked solved
      progress = new UserProgress({ userId: req.userId, problemId });
    }

    progress.notes = note;

    await progress.save();
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const getDueToday = async (req, res) => {
  try {
    const timeZone = getRequestTimeZone(req);

    const startOfTomorrow = getStartOfDayInTimeZone(timeZone, 1);

    const dueProblems = await UserProgress.find({
      userId: req.userId,
      ...ACTIVE_ONLY,
      nextRevisionDate: { $lt: startOfTomorrow },
    }).populate('problemId');

    res.status(200).json(dueProblems);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};


const getRevisionSchedule = async (req, res) => {
  try {
    const schedule = await UserProgress.find({
      userId: req.userId,
      ...ACTIVE_ONLY,
      status: 'done',
      nextRevisionDate: { $ne: null },
    })
      .sort({ nextRevisionDate: 1 })
      .populate('problemId');

    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};


const selectSheet = async (req, res) => {
  try {
    const { sheet } = req.body;

    if (!sheet) {
      return res.status(400).json({ message: 'Sheet name is required' });
    }

    const problemsInSheet = await Problem.find({ sheet });

    if (problemsInSheet.length === 0) {
      return res.status(404).json({ message: 'No problems found for this sheet' });
    }

    const problemIds = problemsInSheet.map((p) => p._id);


    const existingProgress = await UserProgress.find({
      userId: req.userId,
      problemId: { $in: problemIds },
    });
    const existingProblemIds = existingProgress.map((p) => p.problemId.toString());

    // Bring back any entries that were hidden when the sheet was removed
    const restoreResult = await UserProgress.updateMany(
      { userId: req.userId, problemId: { $in: problemIds }, archived: true },
      { $set: { archived: false } }
    );

    // Only create entries for problems the user has never had
    const newProblems = problemsInSheet.filter(
      (problem) => !existingProblemIds.includes(problem._id.toString())
    );

    const newProgressEntries = newProblems.map((problem) => ({
      userId: req.userId,
      problemId: problem._id,
      status: 'not_done',
    }));

    if (newProgressEntries.length > 0) {
      await UserProgress.insertMany(newProgressEntries);
    }

    res.status(201).json({
      message: `${sheet} added successfully`,
      totalProblems: problemsInSheet.length,
      newlyAdded: newProgressEntries.length,
      restored: restoreResult.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};


const hideSheet = async (req, res) => {
  try {
    const { sheetName } = req.params;

    const problemsInSheet = await Problem.find({ sheet: sheetName }).select('_id');
    const problemIds = problemsInSheet.map((p) => p._id);

    const result = await UserProgress.updateMany(
      { userId: req.userId, problemId: { $in: problemIds } },
      { $set: { archived: true } }
    );

    res.status(200).json({
      message: `${sheetName} hidden (progress kept)`,
      hiddenCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const resetProgress = async (req, res) => {
  try {
    const result = await UserProgress.updateMany(
      { userId: req.userId, ...ACTIVE_ONLY },
      {
        $set: {
          status: 'not_done',
          solvedDates: [],
          revisionCount: 0,
          lapses: 0,
          nextRevisionDate: null,
        },
      }
    );

    res.status(200).json({
      message: 'Progress reset',
      resetCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    // Validate the timezone and build a reusable date formatter
    const timeZone = getRequestTimeZone(req);
    const formatDateKey = makeDateKeyFormatter(timeZone);

    // Everything the user has, hidden sheets included
    const allProgress = await UserProgress.find({ userId: req.userId }).populate('problemId');

    // Only the entries the user can currently see
    const activeProgress = allProgress.filter((entry) => !entry.archived);

    // heatmapData: { "2026-01-15": 2, "2026-01-16": 1, ... }
    const heatmapData = {};
    allProgress.forEach((entry) => {
      entry.solvedDates.forEach((date) => {
        // Format the date as it appears on the user's own calendar (their timezone)
        const dateString = formatDateKey.format(date);
        heatmapData[dateString] = (heatmapData[dateString] || 0) + 1;
      });
    });

    // topicStats: { "Arrays & Hashing": { solved: 2, total: 9 }, ... }
    const topicStats = {};
    activeProgress.forEach((entry) => {
      if (!entry.problemId) return; // skip if the referenced problem no longer exists

      const topic = entry.problemId.topic;

      if (!topicStats[topic]) {
        topicStats[topic] = { solved: 0, total: 0 };
      }

      topicStats[topic].total += 1;
      if (entry.status === 'done') {
        topicStats[topic].solved += 1;
      }
    });

    const totalProblems = activeProgress.length;
    const totalSolved = activeProgress.filter((entry) => entry.status === 'done').length;

    res.status(200).json({ heatmapData, topicStats, totalProblems, totalSolved });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
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
};