const express = require('express');
const {
  signup,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  googleLogin,
  githubLogin,
  getProfile,
  updateProfile,
} = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const {
  loginLimiter,
  signupLimiter,
  emailSendLimiter,
  otpCheckLimiter,
  googleAuthLimiter,
  githubAuthLimiter,
} = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/signup', signupLimiter, signup);
router.post('/verify-otp', otpCheckLimiter, verifyOtp);
router.post('/resend-otp', emailSendLimiter, resendOtp);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', emailSendLimiter, forgotPassword);
router.post('/reset-password', otpCheckLimiter, resetPassword);
router.post('/google', googleAuthLimiter, googleLogin);
router.post('/github', githubAuthLimiter, githubLogin);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);

module.exports = router;