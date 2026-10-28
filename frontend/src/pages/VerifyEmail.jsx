// pages/VerifyEmail.jsx
// This page appears after signup (or after a login attempt with an unverified
// email). The user types the 6-digit code that was emailed to them.
//
// The email address arrives through the router's "state" (set by Signup/Login
// with navigate('/verify-email', { state: { email } })). If someone opens this
// page directly, there is no email to verify, so we send them back to signup.

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import api from '../services/api';
import { saveToken } from '../utils/auth';
import AuthLayout from '../components/AuthLayout';
import {
  otpInputClass,
  primaryButtonClass,
  errorBoxClass,
  successBoxClass,
  linkClass,
  footerTextClass,
} from '../utils/authStyles';

// How long the Resend button stays disabled after a code was sent
// (the backend enforces the same 60 seconds, this just shows the countdown)
const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  // The email we are verifying (null if the page was opened directly)
  const email = location.state && location.state.email;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Seconds left until "Resend code" can be used again.
  // It starts at 60 because a code was JUST sent when we arrived here.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // Counts the cooldown down by one every second
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);

    // Cleanup: stops the timer if the page closes or the cooldown changes
    return () => clearTimeout(timer);
  }, [cooldown]);

  // No email to verify -> go back to signup
  if (!email) {
    return <Navigate to="/signup" replace />;
  }

  // Keep only digits and allow at most 6 (also handles pasting "123 456")
  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit code');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/verify-otp', { email, otp });

      // Verified! Save the token so the user is logged in, then go to the dashboard
      saveToken(response.data.token);
      navigate('/dashboard');
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

  const handleResend = async () => {
    setError('');
    setInfo('');
    setIsResending(true);

    try {
      await api.post('/auth/resend-otp', { email });

      setInfo('A new code has been sent to your email.');
      setOtp('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const data = err.response && err.response.data;

      // The server may say "wait N more seconds" — sync our timer with it
      if (data && data.retryAfterSeconds) {
        setCooldown(data.retryAfterSeconds);
      }

      setError((data && data.message) || 'Could not resend the code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Verify your email"
      subtitle={
        <>
          We sent a 6-digit code to{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>.
          It expires in 10 minutes. Check your spam folder if you can't find it.
        </>
      }
    >
      {error && (
        <p role="alert" className={errorBoxClass}>
          {error}
        </p>
      )}

      {info && (
        <p role="status" className={successBoxClass}>
          {info}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={handleOtpChange}
          placeholder="000000"
          maxLength={6}
          aria-label="6-digit verification code"
          className={otpInputClass}
        />

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      <div className={footerTextClass}>
        Didn't get the code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          className={`${linkClass} disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed`}
        >
          {isResending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>

      <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
        Wrong email?{' '}
        <Link to="/signup" className={linkClass}>
          Go back to sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

export default VerifyEmail;