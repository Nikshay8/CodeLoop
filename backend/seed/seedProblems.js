const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Problem = require('../models/Problem');

dotenv.config();

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const validateSheet = (problems) => {
  const errors = [];

  if (!Array.isArray(problems) || problems.length === 0) {
    return ['File must contain a non-empty JSON array of problems'];
  }

  const seenTitles = new Set();

  problems.forEach((problem, index) => {
    const label = `Problem #${index + 1}${problem && problem.title ? ` ("${problem.title}")` : ''}`;

    // Every field must exist and be a non-empty string
    ['title', 'link', 'topic', 'difficulty'].forEach((field) => {
      if (typeof problem[field] !== 'string' || problem[field].trim() === '') {
        errors.push(`${label}: "${field}" is missing or empty`);
      }
    });

    if (problem.difficulty && !VALID_DIFFICULTIES.includes(problem.difficulty)) {
      errors.push(
        `${label}: difficulty "${problem.difficulty}" is invalid (use exactly Easy, Medium or Hard)`
      );
    }

    if (typeof problem.link === 'string' && !/^https?:\/\//.test(problem.link)) {
      errors.push(`${label}: link must start with http:// or https://`);
    }

    if (typeof problem.title === 'string') {
      if (seenTitles.has(problem.title)) {
        errors.push(`${label}: duplicate title in the same sheet`);
      }
      seenTitles.add(problem.title);
    }
  });

  return errors;
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const dataFolder = path.join(__dirname, '../data');

    // Every .json file in /data is treated as one sheet
    const files = fs.readdirSync(dataFolder).filter((file) => file.endsWith('.json'));

    for (const file of files) {
      let problems;
      try {
        problems = JSON.parse(fs.readFileSync(path.join(dataFolder, file), 'utf-8'));
      } catch (parseError) {
        console.log(`${file}: SKIPPED — not valid JSON (${parseError.message})`);
        continue;
      }

      const errors = validateSheet(problems);
      if (errors.length > 0) {
        console.log(`${file}: SKIPPED — fix these ${errors.length} error(s) and run again:`);
        errors.forEach((message) => console.log(`   - ${message}`));
        continue;
      }
      const sheetName = path.basename(file, '.json');

      const operations = problems.map((problem, index) => ({
        updateOne: {
          filter: { sheet: sheetName, title: problem.title },
          update: { $set: { ...problem, sheet: sheetName, order: index } },
          upsert: true,
        },
      }));

      const result = await Problem.bulkWrite(operations);
      console.log(
        `${file}: ${problems.length} problems — ${result.upsertedCount} new, ` +
          `${result.matchedCount} already existed (refreshed)`
      );
    }

    console.log('Seeding complete');
  } catch (error) {
    console.log('Error seeding database:', error.message);
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = { validateSheet };