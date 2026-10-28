// components/ProtectedRoute.jsx
// Wraps pages that require login (Dashboard, Problems, Revision, Analytics, Profile).
// If there's no valid token, the user is redirected to the login page instead.

import { Navigate } from 'react-router-dom';
import { getValidToken } from '../utils/auth';

function ProtectedRoute({ children }) {
  // getValidToken() returns the token only if it exists AND has not expired.
  // An expired token is deleted and treated the same as "not logged in".
  // (Before this fix we only checked that a token existed, so an expired token
  // let the user into the page and every API call then failed.)
  const token = getValidToken();

  // No valid token — redirect to login
  // `replace` avoids adding a history entry, so the back button doesn't bounce them here again
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Valid token — show the actual protected page content
  return children;
}

export default ProtectedRoute;