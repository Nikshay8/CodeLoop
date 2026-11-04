// seed/buildStriverSheet.js
// One-time (re-runnable) script that BUILDS backend/data/striver_a2z.json,
// the data file for Striver's A2Z DSA Sheet. After running it, run the normal
// seeder (node seed/seedProblems.js) to load the sheet into the database.

const fs = require('fs');
const path = require('path');
const { validateSheet } = require('./seedProblems');

// The exact version of the dataset we trust (a commit of the repo named above)
const DATASET_COMMIT = '015c9ff63c62f71da1b016d9cd1547cbe667cc62';
const BASE_URL = `https://raw.githubusercontent.com/geckguy/striver-a2z-sheet/${DATASET_COMMIT}`;
const SHEET_URL = `${BASE_URL}/site/data.json`;
const CODOLIO_URL = `${BASE_URL}/data/raw/codolio.json`;

const OUTPUT_FILE = path.join(__dirname, '../data/striver_a2z.json');

const PREMIUM_USES_TAKEUFORWARD = true;

const TIER_TO_DIFFICULTY = { basic: 'Easy', core: 'Medium', pro: 'Hard' };

const REAL_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const loadJson = async (source) => {
  if (fs.existsSync(source)) {
    return JSON.parse(fs.readFileSync(source, 'utf-8'));
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${source}`);
  }
  return response.json();
};

const getTakeUForwardUrl = (problem) => {
  if (problem.platform === 'takeuforward') return problem.url;

  const alternative = (problem.altUrls || []).find((alt) => alt.platform === 'takeuforward');
  return alternative ? alternative.url : '';
};

const pickLink = (problem) => {
  const takeUForwardUrl = getTakeUForwardUrl(problem);

  if (problem.platform === 'leetcode') {
    const lockedBehindPremium = problem.premium && PREMIUM_USES_TAKEUFORWARD && takeUForwardUrl;
    if (!lockedBehindPremium) return { link: problem.url, platform: 'leetcode' };
  }

  if (takeUForwardUrl) return { link: takeUForwardUrl, platform: 'takeuforward' };

  // Safety net so a problem is never left without a link
  if (problem.url) return { link: problem.url, platform: problem.platform };

  throw new Error(`"${problem.title}" has no usable link`);
};

const build = async () => {
  const sheetSource = process.argv[2] || SHEET_URL;

  console.log(`Reading the dataset from: ${sheetSource}`);
  const dataset = await loadJson(sheetSource);
  const problems = [...dataset.problems].sort((a, b) => a.order - b.order);

  const codolioDifficulty = new Map();
  try {
    const codolio = await loadJson(CODOLIO_URL);
    codolio.forEach((item) => {
      if (REAL_DIFFICULTIES.includes(item.difficultyRaw)) {
        codolioDifficulty.set(item.problemId, item.difficultyRaw);
      }
    });
  } catch (error) {
    console.log(`(Skipping codolio difficulty labels: ${error.message})`);
  }

  const stats = {
    leetcode: 0,
    takeuforward: 0,
    premiumMovedToTakeuforward: 0,
    difficultyFromSheet: 0,
    difficultyFromCodolio: 0,
    difficultyEstimatedFromTier: 0,
  };

  const output = problems.map((problem) => {
    const { link, platform } = pickLink(problem);
    stats[platform] = (stats[platform] || 0) + 1;
    if (problem.premium && platform === 'takeuforward' && problem.platform === 'leetcode') {
      stats.premiumMovedToTakeuforward += 1;
    }

    let difficulty = problem.difficulty;
    if (REAL_DIFFICULTIES.includes(difficulty)) {
      stats.difficultyFromSheet += 1;
    } else if (codolioDifficulty.has(problem.slug)) {
      difficulty = codolioDifficulty.get(problem.slug);
      stats.difficultyFromCodolio += 1;
    } else {
      difficulty = TIER_TO_DIFFICULTY[problem.tier] || 'Medium';
      stats.difficultyEstimatedFromTier += 1;
    }

    return {
      title: problem.title.trim(),
      link,
      topic: problem.stepTitle.trim(),
      difficulty,
    };
  });

  const errors = validateSheet(output);
  if (errors.length > 0) {
    console.log(`The built sheet has ${errors.length} problem(s), nothing was written:`);
    errors.forEach((message) => console.log(`   - ${message}`));
    process.exit(1);
  }

  const lines = output.map((problem) => `  ${JSON.stringify(problem)}`);
  fs.writeFileSync(OUTPUT_FILE, `[\n${lines.join(',\n')}\n]\n`);

  const topics = new Set(output.map((problem) => problem.topic)).size;
  console.log(`\nWrote ${output.length} problems in ${topics} topics -> ${OUTPUT_FILE}`);
  console.log(`  Open on LeetCode:     ${stats.leetcode}`);
  console.log(`  Open on takeuforward: ${stats.takeuforward}`);
  console.log(`  (premium LeetCode problems moved to takeuforward: ${stats.premiumMovedToTakeuforward})`);
  console.log('Difficulty source:');
  console.log(`  from the sheet:       ${stats.difficultyFromSheet}`);
  console.log(`  from codolio:         ${stats.difficultyFromCodolio}`);
  console.log(`  ESTIMATED from tier:  ${stats.difficultyEstimatedFromTier}`);
  console.log('\nNext step: node seed/seedProblems.js');
};

build().catch((error) => {
  console.log('Build failed:', error.message);
  process.exit(1);
});