// pages/Login.jsx
// This page lets an existing user log in.
//
// Login deliberately does NOT check password strength: people who signed up before
// the strength rules existed must still be able to get in. It only checks that the
// email looks valid and that a password was entered; the server decides the rest.
//
// The card, background and shared styles come from components/AuthLayout.jsx and
// utils/authStyles.js, so this file only contains the form and its logic.

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import AuthLayout, { AuthDivider } from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import GitHubSignInButton from '../components/GitHubSignInButton';
import { validateEmail } from '../utils/validators';
import {
  labelClass,
  fieldErrorClass,
  getInputClass,
  primaryButtonClass,
  errorBoxClass,
  successBoxClass,
  linkClass,
  footerTextClass,
} from '../utils/authStyles';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Error from the server (wrong password, network problem, ...)
  const [error, setError] = useState('');

  // Whether the user already left each field / pressed Login (errors show only then)
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  // After a successful password reset we arrive here with a success message
  // in the router state (see ResetPassword.jsx)
  const location = useLocation();
  const successMessage = location.state && location.state.message;

  // Instant checks: a valid-looking email and a non-empty password
  const emailError = validateEmail(email);
  const passwordError = password === '' ? 'Password is required' : '';

  const visibleEmailError = (touched.email || submitAttempted) && emailError;
  const visiblePasswordError = (touched.password || submitAttempted) && passwordError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitAttempted(true);

    // Don't bother the server with an obviously invalid form
    if (emailError || passwordError) return;

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', { email: email.trim(), password });

      // Save the token so the user stays logged in across page reloads
      localStorage.setItem('token', response.data.token);

      navigate('/dashboard');
    } catch (err) {
      const data = err.response && err.response.data;

      // The password was right but the email isn't verified yet. The server has just
      // emailed a new code, so open the verification page.
      if (err.response && err.response.status === 403 && data && data.requiresVerification) {
        navigate('/verify-email', { state: { email: data.email } });
        return;
      }

      if (data && data.message) {
        setError(data.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue your revision streak.">
      {/* role="status" / role="alert" make screen readers announce the messages */}
      {successMessage && (
        <p role="status" className={successBoxClass}>
          {successMessage}
        </p>
      )}

      {error && (
        <p role="alert" className={errorBoxClass}>
          {error}
        </p>
      )}

      {/* noValidate turns off the browser's own pop-up bubbles, so OUR messages are the ones shown */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-email" className={labelClass}>Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((previous) => ({ ...previous, email: true }))}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(visibleEmailError)}
            className={getInputClass(Boolean(visibleEmailError))}
          />
          {visibleEmailError && <p className={fieldErrorClass}>{visibleEmailError}</p>}
        </div>

        <div>
          <label htmlFor="login-password" className={labelClass}>Password</label>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((previous) => ({ ...previous, password: true }))}
            autoComplete="current-password"
            hasError={Boolean(visiblePasswordError)}
          />

          {visiblePasswordError && <p className={fieldErrorClass}>{visiblePasswordError}</p>}

          {/* Link to the password reset flow */}
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className={`text-xs ${linkClass}`}>
              Forgot password?
            </Link>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {/* ----- Divider + social sign-in ----- */}
      <AuthDivider />

      {/* Both social buttons stacked, with a small gap between them */}
      <div className="space-y-3">
        <GoogleSignInButton onError={setError} />
        <GitHubSignInButton />
      </div>

      <p className={footerTextClass}>
        Don't have an account?{' '}
        <Link to="/signup" className={linkClass}>
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;