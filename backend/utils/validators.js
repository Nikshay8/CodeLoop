const validator = require('validator');
const dns = require('dns').promises;

const EMAIL_MAX_LENGTH = 254;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;

const WEAK_PATTERNS = [
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'qwerty', 'asdfgh', 'zxcvbn',
  'letmein', 'welcome', 'iloveyou', 'admin', 'login', 'master', 'dragon',
  'monkey', 'football', 'baseball', 'superman', 'princess', 'sunshine',
  'secret', 'changeme', 'trustno1', 'abc123', '123456', '111111', '000000',
  'codeloop', 'leetcode',
];

const validateName = (name) => {
  if (!name) return 'Name is required';
  if (name.length < NAME_MIN_LENGTH) return `Name must be at least ${NAME_MIN_LENGTH} characters`;
  if (name.length > NAME_MAX_LENGTH) return `Name must be at most ${NAME_MAX_LENGTH} characters`;
  return null;
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const validateEmailFormat = (email) => {
  if (!email) return 'Email is required';
  if (email.length > EMAIL_MAX_LENGTH) return 'Email is too long';

  const isValid = validator.isEmail(email, {
    allow_utf8_local_part: false,
    require_tld: true,
  });

  return isValid ? null : 'Please enter a valid email address';
};

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('Lookup timed out');
      error.code = 'ETIMEOUT';
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const canEmailDomainReceiveMail = async (email) => {
  const domain = email.split('@')[1];

  try {
    const records = await withTimeout(dns.resolveMx(domain), 3000);
    return Array.isArray(records) && records.length > 0;
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') return false;
    return true;
  }
};

const getPasswordErrors = (password, context = {}) => {
  const errors = [];
  const lower = password.toLowerCase();

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (password.length > PASSWORD_MAX_LENGTH || Buffer.byteLength(password, 'utf8') > 72) {
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) errors.push('Password needs at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password needs at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password needs at least one number');

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password needs at least one special character (like ! @ # $)');
  }

  if (WEAK_PATTERNS.some((pattern) => lower.includes(pattern))) {
    errors.push('Password is too common or easy to guess');
  }

  const personalPieces = [];
  if (context.email) personalPieces.push(context.email.split('@')[0]);
  if (context.name) personalPieces.push(...context.name.split(/\s+/));

  const usesPersonalInfo = personalPieces
    .map((piece) => piece.toLowerCase())
    .filter((piece) => piece.length >= 3)
    .some((piece) => lower.includes(piece));

  if (usesPersonalInfo) {
    errors.push('Password must not contain your name or email');
  }

  return errors;
};

module.exports = {
  normalizeEmail,
  validateName,
  validateEmailFormat,
  canEmailDomainReceiveMail,
  getPasswordErrors,
};