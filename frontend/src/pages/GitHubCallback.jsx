// pages/GitHubCallback.jsx
// The page GitHub sends the user back to after they click "Authorize".
// The URL looks like:  /auth/github/callback?code=abc123&state=9f2c...
// (or  ?error=access_denied  if the user pressed "Cancel" on GitHub)
//
// What this page does:
//   1. Checks that "state" matches the one we saved before leaving (safety check)
//   2. Sends the one-time "code" to our backend (POST /auth/github)
//   3. The backend talks to GitHub, finds/creates the user and returns OUR token
//   4. We save that token and open the dashboard — a normal login from here on
// If anything fails, we show the error with a button back to the login page.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../services/api';
import { saveToken } from '../utils/auth';
import AuthLayout from '../components/AuthLayout';
import { GITHUB_STATE_KEY } from '../components/GitHubSignInButton';
import { primaryButtonClass, errorBoxClass } from '../utils/authStyles';

function GitHubCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  // IMPORTANT: a GitHub "code" can be used only ONCE. In development, React's
  // StrictMode runs effects twice, which would send the code twice and the second
  // try would fail. This ref remembers "already started", so we only run once.
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const githubError = searchParams.get('error');

    // The saved state is removed right away — each state works only once
    const savedState = sessionStorage.getItem(GITHUB_STATE_KEY);
    sessionStorage.removeItem(GITHUB_STATE_KEY);

    // The user pressed "Cancel" on GitHub
    if (githubError) {
      setError('GitHub sign-in was cancelled.');
      return;
    }

    // No code, or the state doesn't match -> this didn't start from our button
    if (!code || !returnedState || !savedState || returnedState !== savedState) {
      setError('GitHub sign-in failed. Please try again.');
      return;
    }

    const signInWithGitHub = async () => {
      try {
        const response = await api.post('/auth/github', { code });

        // Save our own login token so the user stays logged in, then open the dashboard
        saveToken(response.data.token);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError('Something went wrong. Please try again.');
        }
      }
    };

    signInWithGitHub();
  }, [searchParams, navigate]);

  // Failed: show the error and a way back to the login page
  if (error) {
    return (
      <AuthLayout centered title="Sign-in failed">
        <p role="alert" className={`mt-5 ${errorBoxClass}`}>
          {error}
        </p>
        <Link to="/login" className={`block text-center ${primaryButtonClass}`}>
          Back to login
        </Link>
      </AuthLayout>
    );
  }

  // Still working: a spinning icon while we talk to the backend
  return (
    <AuthLayout
      centered
      icon={Loader2}
      iconSpin
      title="Signing you in..."
      subtitle="Please wait while we connect your GitHub account."
    />
  );
}

export default GitHubCallback;