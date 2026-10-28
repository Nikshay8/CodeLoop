// components/PublicRoute.jsx
// Wraps public-only pages (Landing, Login, Signup).
// If the user is already logged in, they're redirected to the dashboard —
// logged-in users shouldn't see the signup/login forms or marketing landing page.

import { Navigate } from 'react-router-dom';
import { getValidToken } from '../utils/auth';

function PublicRoute({ children }) {
  // Only a token that exists AND is still valid counts as "logged in".
  // This matters: if an expired token still counted, an expired session would
  // bounce between /login -> /dashboard -> /login and the user could never log in again.
  const token = getValidToken();

  // Already logged in — redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  // No valid token — this is an anonymous visitor, show the public page as normal
  return children;
}

export default PublicRoute;