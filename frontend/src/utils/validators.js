// utils/validators.js
// Form-validation helpers for the Signup and Login pages. They give users instant
// feedback while typing. The backend (backend/utils/validators.js) checks the same
// rules again, because the browser can never be fully trusted.

// ---------------------------------------------------------------------------
// Name
// ---------------------------------------------------------------------------

// Returns an error message, or '' if the name is fine
export const validateName = (name) => {
  const value = name.trim();

  if (!value) return 'Name is required';
  if (value.length < 2) return 'Name must be at least 2 characters';
  if (value.length > 50) return 'Name must be at most 50 characters';
  return '';
};

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

// A simple shape check: something@something.tld, with no spaces.
// (The backend uses a stricter library; this is enough for instant feedback.)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Returns an error message, or '' if the email looks valid
export const validateEmail = (email) => {
  const value = email.trim();

  if (!value) return 'Email is required';
  if (value.length > 254) return 'Email is too long';
  if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address';
  return '';
};

// Common misspellings of popular email domains -> the correct domain
const DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icloud.con': 'icloud.com',
};

// If the email's domain looks like a typo of a popular one, returns the corrected
// full email (e.g. "nik@gmial.com" -> "nik@gmail.com"). Otherwise returns ''.
export const suggestEmailFix = (email) => {
  const value = email.trim().toLowerCase();
  const atIndex = value.lastIndexOf('@');
  if (atIndex < 1) return '';

  const domain = value.slice(atIndex + 1);
  const fixedDomain = DOMAIN_TYPOS[domain];

  return fixedDomain ? `${value.slice(0, atIndex)}@${fixedDomain}` : '';
};

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export const PASSWORD_MAX_LENGTH = 64;

// If a password CONTAINS any of these (case-insensitive), it counts as too common.
// Same list as the backend.
const WEAK_PATTERNS = [
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'qwerty', 'asdfgh', 'zxcvbn',
  'letmein', 'welcome', 'iloveyou', 'admin', 'login', 'master', 'dragon',
  'monkey', 'football', 'baseball', 'superman', 'princess', 'sunshine',
  'secret', 'changeme', 'trustno1', 'abc123', '123456', '111111', '000000',
  'codeloop', 'leetcode',
];

// True if the password contains the person's name or the part of their email
// before "@". Only pieces of 3+ characters count, to avoid false alarms.
const containsPersonalInfo = (password, { name = '', email = '' }) => {
  const lower = password.toLowerCase();
  const pieces = [email.split('@')[0], ...name.split(/\s+/)];

  return pieces
    .map((piece) => piece.toLowerCase())
    .filter((piece) => piece.length >= 3)
    .some((piece) => lower.includes(piece));
};

// Returns the checklist shown under the password field. Each rule says whether
// the current password passes it: [{ id, label, passed }, ...]
export const getPasswordRules = (password, context = {}) => {
  const lower = password.toLowerCase();

  return [
    { id: 'length', label: 'At least 8 characters', passed: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', passed: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter (a-z)', passed: /[a-z]/.test(password) },
    { id: 'number', label: 'One number (0-9)', passed: /[0-9]/.test(password) },
    {
      id: 'special',
      label: 'One special character (! @ # $ ...)',
      passed: /[^A-Za-z0-9]/.test(password),
    },
    {
      id: 'common',
      label: 'Not a common password',
      // An empty box shouldn't show as "passed" before the user has typed anything
      passed: password.length > 0 && !WEAK_PATTERNS.some((pattern) => lower.includes(pattern)),
    },
    {
      id: 'personal',
      label: "Doesn't contain your name or email",
      passed: password.length > 0 && !containsPersonalInfo(password, context),
    },
  ];
};

// Turns the checklist into a strength level for the colored bar.
//   score 0 = empty, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
// isValid is true only when EVERY rule passes — that is what allows signup.
export const getPasswordStrength = (rules, password) => {
  const passedCount = rules.filter((rule) => rule.passed).length;
  const isValid = passedCount === rules.length;

  if (password.length === 0) return { score: 0, label: '', isValid: false };
  if (isValid) return { score: 4, label: 'Strong', isValid: true };
  if (passedCount >= 6) return { score: 3, label: 'Good', isValid: false };
  if (passedCount >= 4) return { score: 2, label: 'Fair', isValid: false };
  return { score: 1, label: 'Weak', isValid: false };
};