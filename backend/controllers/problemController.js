const Problem = require('../models/Problem');
const UserProgress = require('../models/UserProgress');

const getProblems = async (req, res) => {
  try {
    const { topic, difficulty, sheet } = req.query;

    const filter = {};
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (sheet) filter.sheet = sheet;

    const problems = await Problem.find(filter);
    res.status(200).json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const getAvailableSheets = async (req, res) => {
  try {
    const sheets = await Problem.distinct('sheet');
    res.status(200).json(sheets);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const createProblem = async (req, res) => {
  try {
    const { title, link, topic, difficulty } = req.body;

    if (!title || !link || !topic || !difficulty) {
      return res.status(400).json({ message: 'Title, link, topic, and difficulty are all required' });
    }

    const newProblem = await Problem.create({
      title,
      link,
      topic,
      difficulty,
      sheet: 'custom',
    });

    await UserProgress.create({
      userId: req.userId,
      problemId: newProblem._id,
      status: 'not_done',
    });

    res.status(201).json(newProblem);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { getProblems, createProblem, getAvailableSheets };