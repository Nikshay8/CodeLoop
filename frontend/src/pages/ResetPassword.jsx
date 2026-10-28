// pages/ResetPassword.jsx
// Second step of resetting a forgotten password: the user types the 6-digit code
// from the email and chooses a new password.
//
// The email arrives through the router's "state" (set by ForgotPassword with
// navigate('/reset-password', { state: { email } })). If someone opens this page
// directly there is no email, so we send them to the forgot-password page.
//
// The new password uses the same live checklist + strength bar as the Signup page.

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import api from '../services/api';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import {
  getPasswordRules,
  getPasswordStrength,
  PASSWORD_MAX_LENGTH,
} from '../utils/validators';
import {
  labelClass,
  fieldErrorClass,
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

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // The email we are resetting the password for (null if the page was opened directly)
  const email = location.state && location.state.email;

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Seconds left until "Resend code" can be used again.
  // It starts at 60 because a code was JUST requested when we arrived here.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // Counts the cooldown down by one every second
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);

    // Cleanup: stops the timer if the page closes or the cooldown changes
    return () => clearTimeout(timer);
  }, [cooldown]);

  // No email to work with -> go back to the first step
  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  // ---------- Live password validation (recalculated on every keystroke) ----------
  // (The server also checks that the password doesn't contain the user's name)
  const passwordRules = getPasswordRules(newPassword, { email });
  const passwordStrength = getPasswordStrength(passwordRules, newPassword);

  let passwordError = '';
  if (newPassword === '') passwordError = 'Password is required';
  else if (!passwordStrength.isValid) passwordError = 'Password does not meet all the requirements';

  const visiblePasswordError = (passwordTouched || submitAttempted) && passwordError;

  // Keep only digits and allow at most 6 (also handles pasting "123 456")
  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitAttempted(true);

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit code');
      return;
    }

    // Stop here if the password is invalid — the error is now visible under the field
    if (passwordError) return;

    setIsSubmitting(true);

    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });

      // Done! Send the user to the login page with a success message
      navigate('/login', {
        state: { message: 'Password reset successfully. Please log in with your new password.' },
      });
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

  // Asks the server for a new code (it uses the same route as the first step)
  const handleResend = async () => {
    setError('');
    setInfo('');
    setIsResending(true);

    try {
      await api.post('/auth/forgot-password', { email });

      setInfo('If an account exists for this email, a new code has been sent.');
      setOtp('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const data = err.response && err.response.data;
      setError((data && data.message) || 'Could not resend the code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Reset your password"
      subtitle={
        <>
          If an account exists for{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>, we sent
          a 6-digit code to it. The code expires in 10 minutes. Check your spam folder if you
          can't find it.
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
        {/* ----- 6-digit code ----- */}
        <div>
          <label htmlFor="reset-otp" className={labelClass}>Verification code</label>
          <input
            id="reset-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={handleOtpChange}
            placeholder="000000"
            maxLength={6}
            className={otpInputClass}
          />
        </div>

        {/* ----- New password ----- */}
        <div>
          <label htmlFor="reset-password" className={labelClass}>New password</label>
          <PasswordInput
            id="reset-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            hasError={Boolean(visiblePasswordError)}
          />
          {visiblePasswordError && <p className={fieldErrorClass}>{visiblePasswordError}</p>}

          {/* The live checklist + strength bar appear as soon as the user types */}
          {newPassword.length > 0 && (
            <PasswordStrengthMeter rules={passwordRules} strength={passwordStrength} />
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? 'Resetting...' : 'Reset password'}
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
        <Link to="/login" className={linkClass}>
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPassword;