const rateLimit = require('express-rate-limit');

const MINUTE = 60 * 1000;

const formatWait = (seconds) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const createLimiter = ({ windowMs, limit, message, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
      const resetTime = req.rateLimit && req.rateLimit.resetTime;
      const secondsLeft = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(windowMs / 1000);

      res.status(429).json({
        message: `${message} Please try again in ${formatWait(secondsLeft)}.`,
        retryAfterSeconds: secondsLeft,
      });
    },
  });

const apiLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 500,
  message: 'Too many requests.',
});

const loginLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  message: 'Too many login attempts.',
  skipSuccessfulRequests: true,
});

const signupLimiter = createLimiter({
  windowMs: 60 * MINUTE,
  limit: 10,
  message: 'Too many signup attempts.',
});

const emailSendLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  message: 'Too many code requests.',
});

const otpCheckLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  message: 'Too many attempts.',
});

const googleAuthLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: 'Too many Google sign-in attempts.',
});

const githubAuthLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: 'Too many GitHub sign-in attempts.',
});

module.exports = {
  apiLimiter,
  loginLimiter,
  signupLimiter,
  emailSendLimiter,
  otpCheckLimiter,
  googleAuthLimiter,
  githubAuthLimiter,
};