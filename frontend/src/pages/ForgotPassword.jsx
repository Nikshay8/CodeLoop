// pages/ForgotPassword.jsx
// First step of resetting a forgotten password: the user enters their email.
// We ask the server to send a 6-digit code, then open the reset page.
//
// The server always answers with the same "success" message, whether or not the
// email has an account (so nobody can use this page to find out who is registered).
// That is why the next page says "If an account exists..." instead of "We sent...".

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import api from '../services/api';
import AuthLayout from '../components/AuthLayout';
import { validateEmail } from '../utils/validators';
import {
  labelClass,
  fieldErrorClass,
  getInputClass,
  primaryButtonClass,
  errorBoxClass,
  linkClass,
  footerTextClass,
} from '../utils/authStyles';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  // Instant check: does the email look valid?
  const emailError = validateEmail(email);
  const visibleEmailError = (touched || submitAttempted) && emailError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitAttempted(true);

    // Don't bother the server with an obviously invalid email
    if (emailError) return;

    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim();

      await api.post('/auth/forgot-password', { email: cleanEmail });

      // Open the reset page and hand over the email through the router state
      navigate('/reset-password', { state: { email: cleanEmail } });
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a 6-digit code to reset it."
    >
      {error && (
        <p role="alert" className={errorBoxClass}>
          {error}
        </p>
      )}

      {/* noValidate turns off the browser's own pop-up bubbles, so OUR messages are the ones shown */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className={labelClass}>Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            aria-invalid={Boolean(visibleEmailError)}
            className={getInputClass(Boolean(visibleEmailError))}
          />
          {visibleEmailError && <p className={fieldErrorClass}>{visibleEmailError}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? 'Sending code...' : 'Send code'}
        </button>
      </form>

      <p className={footerTextClass}>
        Remembered it?{' '}
        <Link to="/login" className={linkClass}>
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPassword;