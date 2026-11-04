<div align="center">

# CodeLoop

**Spaced revision for DSA problems. Solve once, remember for good.**

Track your progress on popular DSA sheets and get reminded to revise each problem right before you'd forget it.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)

</div>

<!-- Add your live demo link and demo video link here after deployment -->

---

## Why CodeLoop?

Most DSA trackers stop at a tick mark. You solve a problem, tick it, and a month later you can't solve it again.

CodeLoop adds the missing half: **spaced repetition**. Every time you solve a problem, it schedules the next revision at growing intervals (1, 3, 7, 15, then every 30 days). If a revision goes badly, one click restarts that problem's cycle.

## Features

### Practice sheets
- **NeetCode 150**, **Blind 75** and **Striver's A2Z DSA Sheet** are ready to import with one click.
- Each sheet keeps its own order and topic grouping.
- Hiding a sheet **never deletes your progress**. Add it back and everything is restored.
- Add your own problems with the custom problem form.
- Adding a new sheet is just dropping in a JSON file (see [Adding a new sheet](#adding-a-new-sheet)).

### Problems page
- Topic-wise collapsible sections with progress bars, like NeetCode.
- Tick **and untick** problems with one click.
- Search by problem name or topic.
- Filter by difficulty (Easy / Medium / Hard) and status (Solved / Unsolved).
- **Random problem** picker (prefers unsolved ones and respects your filters).
- Reset progress for everything on the page (your notes are kept).
- Per-problem notes (approach, complexity, tricks) that keep growing with you.
- Problems open on **LeetCode** when they exist there, and on **takeuforward** when they don't.

### Spaced revision
- Revision schedule with **Due now** and **Upcoming** sections.
- **Mark Revised** when you solved it from memory, and the next revision moves further out.
- **Can't Recall** when you needed the solution, and the problem restarts from day 1.
- A **"Forgot N×"** counter shows which problems keep slipping.

### Dashboard and analytics
- Overall stats, due-today list and topic-wise progress.
- GitHub-style **activity heatmap** of your solving history.
- Analytics charts: problems solved by topic and solving activity over time.
- All dates follow **your own timezone**, so a problem solved at 1 AM counts for that day.

### Accounts and security
- Signup and login with JWT authentication.
- Passwords hashed with **bcrypt** and never stored in plain text.
- Email validation (format and mail-server check, with typo hints like "Did you mean gmail.com?").
- **Strong password rules** with a live strength meter, and common or personal passwords are rejected.
- Expired sessions log you out cleanly instead of breaking pages.
- Dark mode by default with a light mode switch.

## How the revision schedule works

| Revision | Next one comes after |
|---|---|
| Solved for the first time | 1 day |
| 1st revision | 3 days |
| 2nd revision | 7 days |
| 3rd revision | 15 days |
| 4th revision onwards | 30 days |

If you press **Can't Recall** on a problem, it stays solved, goes back to the first step and is scheduled again for tomorrow. Forgetting is not counted as activity, so your heatmap stays honest.

<!--
## Screenshots
Add screenshots to docs/screenshots/ and reference them here, for example:
![Dashboard](docs/screenshots/dashboard.png)
![Problems](docs/screenshots/problems.png)
![Revision](docs/screenshots/revision.png)
![Analytics](docs/screenshots/analytics.png)
-->

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide icons |
| Backend | Node.js, Express 5, JWT, bcryptjs, validator, CORS |
| Database | MongoDB with Mongoose |

## Project structure

```
CodeLoop/
├── backend/
│   ├── controllers/      # auth, problems and progress logic
│   ├── data/             # one JSON file per sheet (neetcode150, blind75, striver_a2z)
│   ├── middleware/       # JWT auth guard
│   ├── models/           # User, Problem, UserProgress
│   ├── routes/           # API route definitions
│   ├── seed/             # seeding scripts
│   ├── utils/            # input validation helpers
│   └── server.js         # entry point
└── frontend/
    └── src/
        ├── components/   # Navbar, TopicSection, ProblemRow, NotesModal, heatmap...
        ├── pages/        # Landing, Login, Signup, Dashboard, Problems, Revision, Analytics, Profile
        ├── services/     # Axios instance
        └── utils/        # date, theme and validation helpers
```

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) 18 or newer
- A MongoDB database: a local install or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Clone the repository

```bash
git clone https://github.com/Nikshay8/CodeLoop.git
cd CodeLoop
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a file named `.env` inside the `backend` folder:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_secret_string
PORT=5000
```

Load the problem sheets into your database:

```bash
node seed/seedProblems.js
```

For the Striver sheet, build its data file first (one time), then seed again:

```bash
node seed/buildStriverSheet.js
node seed/seedProblems.js
```

Start the server:

```bash
npx nodemon server.js
```

The API now runs on `http://localhost:5000`.

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, create an account and add your first sheet from the Problems page.

## Adding a new sheet

Every JSON file in `backend/data/` becomes a sheet automatically. The file name is the sheet name (`blind75.json` becomes `blind75`).

1. Create a JSON file in `backend/data/`:

   ```json
   [
     {
       "title": "Two Sum",
       "link": "https://leetcode.com/problems/two-sum/",
       "topic": "Arrays & Hashing",
       "difficulty": "Easy"
     }
   ]
   ```

2. Run the seeder:

   ```bash
   node seed/seedProblems.js
   ```

3. Refresh the Problems page and pick the sheet from **+ Add sheet**.

The seeder checks every file before importing it. A wrong difficulty (it must be exactly `Easy`, `Medium` or `Hard`), a missing link or a duplicate title skips that file and prints exactly what to fix. Re-running the seeder is always safe because it never wipes existing data.

## API overview

All routes under `/api/progress` and the profile routes need an `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Log in and receive a token |
| GET / PATCH | `/api/auth/profile` | Get or update your profile |
| GET | `/api/problems` | List problems (filter by topic, difficulty, sheet) |
| GET | `/api/problems/sheets` | List the available sheets |
| POST | `/api/problems` | Add a custom problem |
| GET | `/api/progress` | Your progress on all visible problems |
| GET | `/api/progress/stats` | Heatmap data, topic progress and totals |
| GET | `/api/progress/due-today` | Problems due for revision today |
| GET | `/api/progress/revisions` | Full revision schedule |
| POST | `/api/progress/select-sheet` | Add or restore a sheet |
| POST | `/api/progress/reset` | Reset progress (notes are kept) |
| PATCH | `/api/progress/sheet/:sheetName/hide` | Hide a sheet (progress is kept) |
| PATCH | `/api/progress/:problemId/done` | Mark solved or revised |
| PATCH | `/api/progress/:problemId/undone` | Mark as unsolved |
| PATCH | `/api/progress/:problemId/cant-recall` | Restart a problem's revision cycle |
| PATCH | `/api/progress/:problemId/notes` | Save notes |

## Roadmap

- [ ] Email verification and forgot/reset password
- [ ] Sign in with Google and GitHub
- [ ] Deployment (MongoDB Atlas, Render, Vercel)
- [ ] Shared progress across sheets (solve a problem once, tick it everywhere)
- [ ] Platform tag on each problem (LeetCode / takeuforward)
- [ ] More sheets

Have an idea? [Open an issue](https://github.com/Nikshay8/CodeLoop/issues). Feedback is very welcome.

## Acknowledgements and disclaimer

CodeLoop is an independent project and is **not affiliated with** NeetCode, LeetCode or takeuforward. It only stores problem titles and links. Problem statements stay on their original platforms.

- Problem lists: the NeetCode 150, the Blind 75 and Striver's A2Z DSA Sheet.
- Striver's A2Z data was built from takeuforward's public sheet using the open-source dataset [geckguy/striver-a2z-sheet](https://github.com/geckguy/striver-a2z-sheet) (MIT licence).

---

<div align="center">

Built by [Nikshay](https://github.com/Nikshay8). If CodeLoop helps you, a star on the repo means a lot.

</div>
