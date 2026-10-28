const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Problem = require('../models/Problem');

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const dataFolder = path.join(__dirname, '../data');
    const files = fs.readdirSync(dataFolder).filter((file) => file.endsWith('.json'));

    for (const file of files) {
      const problems = JSON.parse(fs.readFileSync(path.join(dataFolder, file), 'utf-8'));
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
        `${file}: ${result.upsertedCount} new, ${result.matchedCount} already existed (refreshed)`
      );
    }

    console.log('Seeding complete');
  } catch (error) {
    console.log('Error seeding database:', error.message);
  } finally {
    await mongoose.connection.close();
  }
};

seedDatabase();