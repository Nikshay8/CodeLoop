const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  normalizeEmail,
  validateName,
  validateEmailFormat,
  canEmailDomainReceiveMail,
  getPasswordErrors,
} = require('../utils/validators');
const {
  OTP_EXPIRY_MINUTES,
  MAX_OTP_ATTEMPTS,
  generateOtp,
  hashOtp,
  isOtpMatch,
  getCooldownSecondsLeft,
} = require('../utils/otp');
const { sendOtpEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

const BCRYPT_ROUNDS = 12;
const EMAIL_COLLATION = { locale: 'en', strength: 2 };

const isString = (value) => typeof value === 'string';

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const googleClient = new OAuth2Client();

const createUnusablePassword = () =>
  bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

const OTP_FIELDS = '+otpHash +otpExpiresAt +otpAttempts +otpLastSentAt';


const issueAndSendOtp = async (user, sendEmailFn = sendOtpEmail) => {
  const otp = generateOtp();

  user.otpHash = hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  try {
    await sendEmailFn({ to: user.email, name: user.name, otp });
  } catch (emailError) {
    console.error('OTP email error:', emailError.message);
    const taggedError = new Error('EMAIL_SEND_FAILED');
    taggedError.code = 'EMAIL_SEND_FAILED';
    throw taggedError;
  }
};

const sendEmailFailedResponse = (res) =>
  res.status(502).json({
    message: "We couldn't send the verification email. Please try again in a moment.",
  });

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!isString(name) || !isString(email) || !isString(password)) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);

    const errors = {};

    const nameError = validateName(cleanName);
    if (nameError) errors.name = nameError;

    const emailError = validateEmailFormat(cleanEmail);
    if (emailError) errors.email = emailError;

    const passwordErrors = getPasswordErrors(password, {
      name: cleanName,
      email: emailError ? '' : cleanEmail,
    });
    if (passwordErrors.length > 0) errors.password = passwordErrors;

    if (!errors.email) {
      const domainOk = await canEmailDomainReceiveMail(cleanEmail);
      if (!domainOk) {
        errors.email = `We couldn't find a mail server for "${cleanEmail.split('@')[1]}". Please check for typos.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      const firstMessage = errors.name || errors.email || errors.password[0];
      return res.status(400).json({ message: firstMessage, errors });
    }

    const existingUser = await User.findOne({ email: cleanEmail })
      .collation(EMAIL_COLLATION)
      .select('+otpLastSentAt');

    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({
        message: 'An account with this email already exists',
        errors: { email: 'An account with this email already exists' },
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let user;

    if (existingUser) {
      user = existingUser;
      user.name = cleanName;
      user.password = hashedPassword;
    } else {
      user = new User({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        isVerified: false,
      });
    }

    if (getCooldownSecondsLeft(user.otpLastSentAt) === 0) {
      await issueAndSendOtp(user);
    } else {
      await user.save();
    }

    res.status(201).json({
      message: 'Account created. We sent a 6-digit code to your email.',
      email: user.email,
      requiresVerification: true,
    });
  } catch (error) {
    if (error.code === 'EMAIL_SEND_FAILED') {
      return sendEmailFailedResponse(res);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists',
        errors: { email: 'An account with this email already exists' },
      });
    }

    console.error('Signup error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    if (!isString(email) || !isString(otp)) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ message: 'Please enter the 6-digit code' });
    }

    const user = await User.findOne({ email: cleanEmail })
      .collation(EMAIL_COLLATION)
      .select('+otpHash +otpExpiresAt +otpAttempts');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'This email is already verified. Please log in.' });
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired code. Please request a new one.' });
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: 'Too many wrong attempts. Please request a new code.',
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    }

    if (!isOtpMatch(cleanOtp, user.otpHash)) {
      await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });

      const attemptsLeft = MAX_OTP_ATTEMPTS - (user.otpAttempts + 1);
      const hint =
        attemptsLeft > 0
          ? `${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`
          : 'Please request a new code.';

      return res.status(400).json({ message: `Incorrect code. ${hint}` });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = undefined;
    user.otpLastSentAt = undefined;
    await user.save();

    res.status(200).json({
      message: 'Email verified successfully',
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!isString(email) || email.trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const cleanEmail = normalizeEmail(email);

    const user = await User.findOne({ email: cleanEmail })
      .collation(EMAIL_COLLATION)
      .select('+otpLastSentAt');

    if (!user || user.isVerified) {
      return res.status(200).json({ message: 'If this email needs verification, a new code has been sent.' });
    }

    const secondsLeft = getCooldownSecondsLeft(user.otpLastSentAt);
    if (secondsLeft > 0) {
      return res.status(429).json({
        message: `Please wait ${secondsLeft} seconds before requesting another code.`,
        retryAfterSeconds: secondsLeft,
      });
    }

    await issueAndSendOtp(user);

    res.status(200).json({ message: 'A new code has been sent to your email.' });
  } catch (error) {
    if (error.code === 'EMAIL_SEND_FAILED') {
      return sendEmailFailedResponse(res);
    }

    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!isString(email) || !isString(password) || email.trim() === '' || password === '') {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = normalizeEmail(email);

    if (validateEmailFormat(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (password.length > 128) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = await User.findOne({ email: cleanEmail })
      .collation(EMAIL_COLLATION)
      .select('+otpLastSentAt');

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      if (getCooldownSecondsLeft(user.otpLastSentAt) === 0) {
        await issueAndSendOtp(user);
      }

      return res.status(403).json({
        message: 'Please verify your email to continue. We sent you a code.',
        requiresVerification: true,
        email: user.email,
      });
    }

    res.status(200).json({
      message: 'Login successful',
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 'EMAIL_SEND_FAILED') {
      return sendEmailFailedResponse(res);
    }

    console.error('Login error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!isString(email) || email.trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const cleanEmail = normalizeEmail(email);

    if (validateEmailFormat(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email: cleanEmail })
      .collation(EMAIL_COLLATION)
      .select('+otpLastSentAt');

    if (user && user.isVerified && getCooldownSecondsLeft(user.otpLastSentAt) === 0) {
      issueAndSendOtp(user, sendPasswordResetEmail).catch((error) => {
        console.error('Forgot password error:', error.message);
      });
    }

    res.status(200).json({
      message: 'If an account exists for this email, we sent a 6-digit code.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};

    if (!isString(email) || !isString(otp) || !isString(newPassword)) {
      return res.status(400).json({ message: 'Email, code and new password are required' });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ message: 'Please enter the 6-digit code' });
    }

    const user = await User.findOne({ email: cleanEmail })
      .collation(EMAIL_COLLATION)
      .select('+otpHash +otpExpiresAt +otpAttempts');

    if (!user || !user.isVerified || !user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired code. Please request a new one.' });
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: 'Too many wrong attempts. Please request a new code.',
      });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    }

    if (!isOtpMatch(cleanOtp, user.otpHash)) {
      await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });

      const attemptsLeft = MAX_OTP_ATTEMPTS - (user.otpAttempts + 1);
      const hint =
        attemptsLeft > 0
          ? `${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`
          : 'Please request a new code.';

      return res.status(400).json({ message: `Incorrect code. ${hint}` });
    }

    const passwordErrors = getPasswordErrors(newPassword, {
      name: user.name,
      email: user.email,
    });
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        message: passwordErrors[0],
        errors: { password: passwordErrors },
      });
    }

    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(400).json({ message: 'New password must be different from your old password' });
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordChangedAt = new Date();

    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = undefined;
    user.otpLastSentAt = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. Please log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body || {};

    if (!isString(credential) || credential === '') {
      return res.status(400).json({ message: 'Google sign-in failed. Please try again.' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('Google login error: GOOGLE_CLIENT_ID is missing in .env');
      return res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      return res.status(400).json({ message: 'Google sign-in failed. Please try again.' });
    }

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(400).json({ message: 'Your Google email address is not verified.' });
    }

    const googleId = payload.sub;
    const cleanEmail = normalizeEmail(payload.email);
    const googleName = (payload.name || cleanEmail.split('@')[0]).trim().slice(0, 50);

    let user = await User.findOne({ googleId }).select(OTP_FIELDS);
    if (!user) {
      user = await User.findOne({ email: cleanEmail })
        .collation(EMAIL_COLLATION)
        .select(OTP_FIELDS);
    }

    if (user) {
      if (user.googleId && user.googleId !== googleId) {
        return res.status(409).json({
          message: 'This email is already linked to a different Google account.',
        });
      }

      user.googleId = googleId;

      if (!user.isVerified) {
        user.name = googleName;
        user.password = await createUnusablePassword();
        user.isVerified = true;
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        user.otpAttempts = undefined;
        user.otpLastSentAt = undefined;
      }

      await user.save();
    } else {
      user = await User.create({
        name: googleName,
        email: cleanEmail,
        password: await createUnusablePassword(),
        googleId,
        isVerified: true,
      });
    }

    res.status(200).json({
      message: 'Login successful',
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const githubLogin = async (req, res) => {
  try {
    const { code } = req.body || {};

    if (!isString(code) || code === '' || code.length > 200) {
      return res.status(400).json({ message: 'GitHub sign-in failed. Please try again.' });
    }

    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      console.error('GitHub login error: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing in .env');
      return res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }

    let accessToken;
    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return res.status(400).json({ message: 'GitHub sign-in failed. Please try again.' });
      }
      accessToken = tokenData.access_token;
    } catch (tokenError) {
      console.error('GitHub token exchange error:', tokenError.message);
      return res.status(502).json({ message: 'Could not reach GitHub. Please try again.' });
    }

    const githubHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodeLoop',
    };

    let profile;
    let emails;
    try {
      const [profileResponse, emailsResponse] = await Promise.all([
        fetch('https://api.github.com/user', { headers: githubHeaders }),
        fetch('https://api.github.com/user/emails', { headers: githubHeaders }),
      ]);

      if (!profileResponse.ok || !emailsResponse.ok) {
        return res.status(400).json({ message: 'GitHub sign-in failed. Please try again.' });
      }

      profile = await profileResponse.json();
      emails = await emailsResponse.json();
    } catch (apiError) {
      console.error('GitHub API error:', apiError.message);
      return res.status(502).json({ message: 'Could not reach GitHub. Please try again.' });
    }

    const verifiedEmails = Array.isArray(emails) ? emails.filter((item) => item.verified) : [];
    const chosenEmail = verifiedEmails.find((item) => item.primary) || verifiedEmails[0];

    if (!profile || !profile.id || !chosenEmail) {
      return res.status(400).json({
        message: 'Your GitHub account has no verified email address.',
      });
    }

    const githubId = String(profile.id);
    const cleanEmail = normalizeEmail(chosenEmail.email);
    const githubName = (profile.name || profile.login || cleanEmail.split('@')[0]).trim().slice(0, 50);

    let user = await User.findOne({ githubId }).select(OTP_FIELDS);
    if (!user) {
      user = await User.findOne({ email: cleanEmail })
        .collation(EMAIL_COLLATION)
        .select(OTP_FIELDS);
    }

    if (user) {
      if (user.githubId && user.githubId !== githubId) {
        return res.status(409).json({
          message: 'This email is already linked to a different GitHub account.',
        });
      }

      user.githubId = githubId;

      if (!user.githubUrl && profile.html_url) {
        user.githubUrl = profile.html_url;
      }

      if (!user.isVerified) {
        user.name = githubName;
        user.password = await createUnusablePassword();
        user.isVerified = true;
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        user.otpAttempts = undefined;
        user.otpLastSentAt = undefined;
      }

      await user.save();
    } else {
      user = await User.create({
        name: githubName,
        email: cleanEmail,
        password: await createUnusablePassword(),
        githubId,
        githubUrl: profile.html_url || '',
        isVerified: true,
      });
    }

    res.status(200).json({
      message: 'Login successful',
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Something went wrong. Please try again.' });
    }
    console.error('GitHub login error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, githubUrl, leetcodeUsername } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (githubUrl !== undefined) user.githubUrl = githubUrl;
    if (leetcodeUsername !== undefined) user.leetcodeUsername = leetcodeUsername;

    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
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
};