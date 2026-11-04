# 🔁 CodeLoop

**CodeLoop** is a full-stack web app to track your DSA practice, revise smartly, and stay consistent. It comes preloaded with the **NeetCode 150**, **Blind 75**, **Striver's A2Z**,  problem lists, so you can focus on solving instead of managing spreadsheets.

## ✨ Features

- **3 preloaded sheets**: topic-wise problem list with difficulty tags
- **Progress tracking**: mark problems as solved and track topic-wise completion
- **Revision system**: flag problems to revisit and review them on the Revision page
- **Notes**: add personal notes to every problem
- **Analytics dashboard**: stats cards and charts to see your progress at a glance
- **Activity heatmap**: GitHub-style heatmap to track daily consistency
- **Custom problems**: add your own problems beyond the NeetCode list
- **Secure authentication**
  - Email and password signup with OTP email verification
  - Forgot / reset password flow
  - Google and GitHub OAuth login
  - JWT-based protected routes
- **Rate limiting** on sensitive endpoints
- **Dark / Light theme** toggle
- **Fully responsive** UI with skeleton loaders and toast notifications

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, Google OAuth, GitHub OAuth, Email OTP |
| Deployment | Vercel (frontend) | Render(Backend)

## 📁 Project Structure

```
CodeLoop/
├── backend/
│   ├── controllers/     # Request handlers (auth, problems, progress)
│   ├── data/            # NeetCode 150 dataset (JSON)
│   ├── middleware/      # Auth & rate limiters
│   ├── models/          # Mongoose models (User, Problem, UserProgress)
│   ├── routes/          # API routes
│   ├── seed/            # Database seeding script
│   ├── utils/           # OTP, email, validators
│   └── server.js
└── frontend/
    ├── public/
    └── src/
        ├── components/  # Reusable UI components
        ├── hooks/       # Custom hooks
        ├── pages/       # App pages
        ├── services/    # API layer
        └── utils/       # Helpers
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or above)
- MongoDB (local or MongoDB Atlas)
- Google and GitHub OAuth credentials (optional, for social login)

### 1. Clone the repository

```bash
git clone https://github.com/Nikshay8/CodeLoop.git
cd CodeLoop
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Email (for OTP)
EMAIL_USER=your_email
EMAIL_PASS=your_email_app_password

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Frontend URL
CLIENT_URL=http://localhost:5173
```

Seed the NeetCode 150, blind 75, Striver's A2Z problems and start the server:

```bash
node seed/seedProblems.js
npm start
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

Start the dev server:

```bash
npm run dev
```

The app will be running at `http://localhost:5173`.

## 🔐 Environment Variables

Never commit your `.env` files. They are already listed in `.gitignore`.

## 🗺️ Roadmap

- [ ] Spaced repetition based revision reminders
- [ ] More problem sets (Neetcode 250, Striver SDE Sheet)
- [ ] Streak notifications
- [ ] Export progress as PDF / CSV

## 🤝 Contributing

Contributions, issues and feature requests are welcome. Feel free to open an issue or submit a pull request.

## 👤 Author

**Nikshay Singh**
GitHub: [@Nikshay8](https://github.com/Nikshay8)

---

⭐ If you found this project useful, consider giving it a star!
