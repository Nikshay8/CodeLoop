const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const problemRoutes = require('./routes/problemRoutes');
const progressRoutes = require('./routes/progressRoutes');
const protect = require('./middleware/authMiddleware');
const { apiLimiter } = require('./middleware/rateLimiters');

dotenv.config();

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
     
      if (!origin || allowedOrigins.length === 0) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('CodeLoop backend is running!');
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/progress', progressRoutes);

app.get('/api/protected-test', protect, (req, res) => {
  res.json({ message: 'You accessed a protected route!', userId: req.userId });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.log('Error connecting to MongoDB:', error.message);
  });

// Hosting platforms provide PORT automatically; 5000 is the local fallback.
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});