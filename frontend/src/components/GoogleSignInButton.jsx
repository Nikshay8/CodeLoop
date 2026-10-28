// components/GoogleSignInButton.jsx
// The "Continue with Google" button, shared by the Login and Signup pages.
//
// How it works: Google gives us a signed "credential" (an ID token) after the user
// picks an account. We send it to our backend (POST /auth/google), which verifies it
// with Google and returns OUR login token. From then on it is a normal login.
//
// Looks: Google's own button can't be styled (it lives inside an iframe, and it
// changes shape depending on whether the browser is signed in to Google). So the
// button you SEE is our own, styled with Tailwind like the rest of the app (it
// follows light/dark mode by itself). On top of it sits Google's real button,
// completely transparent: the user's click lands on it, so Google's login flow
// runs exactly as usual.
//
// The client id comes from frontend/.env (VITE_GOOGLE_CLIENT_ID). Without it the
// button is simply hidden, so the rest of the app keeps working.

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { saveToken } from '../utils/auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// The official four-colour Google "G" logo
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// onError: a function that receives an error message (or '' to clear it),
//          so each page can show it in its own error box
function GoogleSignInButton({ onError }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Google's real button needs a width in pixels (it allows 200 to 400).
  // We measure our own container so the two always have the same width.
  const containerRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(320);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = Math.round(containerRef.current.offsetWidth);
        setButtonWidth(Math.min(400, Math.max(200, width)));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    // Cleanup: stop listening when the button is removed from the page
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // No client id configured -> hide the button instead of showing a broken one
  if (!GOOGLE_CLIENT_ID) {
    console.warn('VITE_GOOGLE_CLIENT_ID is missing in frontend/.env — Google button hidden.');
    return null;
  }

  // Runs when the user has chosen a Google account
  const handleSuccess = async (credentialResponse) => {
    onError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/google', {
        credential: credentialResponse.credential,
      });

      // Save our own login token so the user stays logged in, then open the dashboard
      saveToken(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        onError(err.response.data.message);
      } else {
        onError('Something went wrong. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* "group" lets the visible button react when the mouse is anywhere over the
          container (the invisible Google button on top receives the real hover) */}
      <div ref={containerRef} className="group relative w-full h-10">
        {/* ----- The button the user SEES (our own design) ----- */}
        <div
          className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm font-medium text-gray-700 dark:text-gray-100 group-hover:bg-gray-50 dark:group-hover:bg-gray-800 transition-colors pointer-events-none"
        >
          <GoogleLogo />
          <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
        </div>

        {/* ----- Google's REAL button, fully transparent, laid on top ----- */}
        {/* While signing in we remove it, so the user can't click twice */}
        {!isLoading && (
          <div className="absolute inset-0 flex justify-center overflow-hidden opacity-0">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => onError('Google sign-in failed. Please try again.')}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width={buttonWidth}
            />
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

export default GoogleSignInButton;