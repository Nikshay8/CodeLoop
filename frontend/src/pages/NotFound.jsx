// pages/NotFound.jsx
// Shown for any address that no route in App.jsx matches (a mistyped URL, an old link,
// a page that was removed). Without it, an unknown address showed a blank page below the navbar.
//
// It reuses AuthLayout (the glowing background and centered card of the login pages), so it
// looks like part of the same app. What the buttons offer depends on whether the visitor is
// logged in: a logged-in user goes back to the dashboard, a visitor to the home page or login.

import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { getValidToken } from '../utils/auth';
import { primaryButtonClass } from '../utils/authStyles';

// Look of the second, quieter button (an outlined version of the main one)
const secondaryButtonClass =
  'block w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

function NotFound() {
  // The address the visitor tried to open, for example "/dashbord"
  const { pathname } = useLocation();

  // getValidToken() returns the token only if it exists and has not expired
  const isLoggedIn = Boolean(getValidToken());

  return (
    <AuthLayout
      centered
      icon={Compass}
      title="Page not found"
      subtitle={
        <>
          There is nothing at{' '}
          {/* break-all lets a very long address wrap instead of pushing the card wider */}
          <code className="break-all rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {pathname}
          </code>
          . The link may be wrong, or the page may have moved.
        </>
      }
    >
      <div className="space-y-3">
        {isLoggedIn ? (
          <Link to="/dashboard" className={`block text-center ${primaryButtonClass}`}>
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link to="/" className={`block text-center ${primaryButtonClass}`}>
              Go to home
            </Link>
            <Link to="/login" className={secondaryButtonClass}>
              Log in
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

export default NotFound;