// pages/Signup.jsx
// This page lets a new user create an account.
//
// Validation (instant, while typing):
// - Name: 2 to 50 characters
// - Email: valid format, with a "Did you mean gmail.com?" hint for common typos
// - Password: 7 rules (length, upper/lower, number, special character, not common,
//   no personal info) shown as a live checklist + strength bar
// Errors only appear AFTER the user leaves a field (or presses Sign Up), so nobody
// is told "invalid email" while still typing their first letter.
// The backend validates everything again, and any error it sends back is shown
// under the matching field.
//
// The card, background and shared styles come from components/AuthLayout.jsx and
// utils/authStyles.js, so this file only contains the form and its logic.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AuthLayout, { AuthDivider } from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import GoogleSignInButton from '../components/GoogleSignInButton';
import GitHubSignInButton from '../components/GitHubSignInButton';
import {
  validateName,
  validateEmail,
  suggestEmailFix,
  getPasswordRules,
  getPasswordStrength,
  PASSWORD_MAX_LENGTH,
} from '../utils/validators';
import {
  labelClass,
  fieldErrorClass,
  getInputClass,
  primaryButtonClass,
  errorBoxClass,
  linkClass,
  footerTextClass,
} from '../utils/authStyles';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Which fields the user has already visited (left). Errors only show for these.
  const [touched, setTouched] = useState({ name: false, email: false, password: false });

  // Becomes true after the first click on Sign Up, so every error shows from then on
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Errors sent back by the server, per field: { name, email, password }
  const [serverErrors, setServerErrors] = useState({});

  // A general error that doesn't belong to one field (e.g. "Something went wrong")
  const [formError, setFormError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  // ---------- Live validation (recalculated on every keystroke) ----------
  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const passwordRules = getPasswordRules(password, { name, email });
  const passwordStrength = getPasswordStrength(passwordRules, password);

  let passwordError = '';
  if (password === '') passwordError = 'Password is required';
  else if (!passwordStrength.isValid) passwordError = 'Password does not meet all the requirements';

  // Suggest a corrected email when the domain looks like a typo (e.g. gmial.com)
  const emailSuggestion = suggestEmailFix(email);

  // A field's error is visible once it was touched (or after a submit attempt).
  // A server error is shown too, until the user edits that field again.
  const showName = touched.name || submitAttempted;
  const showEmail = touched.email || submitAttempted;
  const showPassword = touched.password || submitAttempted;

  const visibleNameError = (showName && nameError) || serverErrors.name || '';
  const visibleEmailError = (showEmail && emailError) || serverErrors.email || '';
  const visiblePasswordError = (showPassword && passwordError) || serverErrors.password || '';

  // Marks a field as visited when the user leaves it
  const markTouched = (field) => setTouched((previous) => ({ ...previous, [field]: true }));

  // Removes the server's error for a field as soon as the user starts fixing it
  const clearServerError = (field) =>
    setServerErrors((previous) => ({ ...previous, [field]: undefined }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setFormError('');

    // Stop here if anything is invalid — the errors are now visible under the fields
    if (nameError || emailError || !passwordStrength.isValid) return;

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/signup', {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // The account is created but NOT verified yet, so there is no token.
      // Send the user to the verification page, passing the email along
      // (the backend returns the cleaned-up version of it).
      navigate('/verify-email', { state: { email: response.data.email } });
    } catch (err) {
      const data = err.response && err.response.data;

      if (data && data.errors) {
        // The server named the exact fields that are wrong — show them there
        setServerErrors({
          name: data.errors.name,
          email: data.errors.email,
          // The server sends a list of password problems; show them as one line
          password: Array.isArray(data.errors.password)
            ? data.errors.password.join('. ')
            : data.errors.password,
        });
      } else if (data && data.message) {
        setFormError(data.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start tracking your DSA revision today.">
      {formError && (
        <p role="alert" className={errorBoxClass}>
          {formError}
        </p>
      )}

      {/* noValidate turns off the browser's own pop-up bubbles, so OUR messages are the ones shown */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ----- Name ----- */}
        <div>
          <label htmlFor="signup-name" className={labelClass}>Name</label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearServerError('name');
            }}
            onBlur={() => markTouched('name')}
            autoComplete="name"
            maxLength={50}
            placeholder="Your name"
            aria-invalid={Boolean(visibleNameError)}
            className={getInputClass(Boolean(visibleNameError))}
          />
          {visibleNameError && <p className={fieldErrorClass}>{visibleNameError}</p>}
        </div>

        {/* ----- Email ----- */}
        <div>
          <label htmlFor="signup-email" className={labelClass}>Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearServerError('email');
            }}
            onBlur={() => markTouched('email')}
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            aria-invalid={Boolean(visibleEmailError)}
            className={getInputClass(Boolean(visibleEmailError))}
          />
          {visibleEmailError && <p className={fieldErrorClass}>{visibleEmailError}</p>}

          {/* Typo hint: clicking it replaces the email with the corrected one */}
          {emailSuggestion && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Did you mean{' '}
              <button
                type="button"
                onClick={() => {
                  setEmail(emailSuggestion);
                  clearServerError('email');
                }}
                className={linkClass}
              >
                {emailSuggestion}
              </button>
              ?
            </p>
          )}
        </div>

        {/* ----- Password ----- */}
        <div>
          <label htmlFor="signup-password" className={labelClass}>Password</label>
          <PasswordInput
            id="signup-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearServerError('password');
            }}
            onBlur={() => markTouched('password')}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            hasError={Boolean(visiblePasswordError)}
          />
          {visiblePasswordError && <p className={fieldErrorClass}>{visiblePasswordError}</p>}

          {/* The live checklist + strength bar appear as soon as the user types */}
          {password.length > 0 && (
            <PasswordStrengthMeter rules={passwordRules} strength={passwordStrength} />
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      {/* ----- Divider + social sign-in ----- */}
      <AuthDivider />

      {/* Both social buttons stacked, with a small gap between them */}
      <div className="space-y-3">
        <GoogleSignInButton onError={setFormError} />
        <GitHubSignInButton />
      </div>

      <p className={footerTextClass}>
        Already have an account?{' '}
        <Link to="/login" className={linkClass}>
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;