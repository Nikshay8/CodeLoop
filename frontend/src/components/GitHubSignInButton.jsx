// components/GitHubSignInButton.jsx
// The "Continue with GitHub" button, shared by the Login and Signup pages.
//
// How it works (different from Google!):
// Google gives us a signed token right inside the page. GitHub does NOT — GitHub
// works by sending the user to github.com, and GitHub then sends them BACK to our
// site with a one-time "code" in the URL. So the steps are:
//   1. This button sends the browser to GitHub's authorize page.
//   2. The user clicks "Authorize" on GitHub.
//   3. GitHub redirects to /auth/github/callback?code=...&state=...
//      -> pages/GitHubCallback.jsx takes over, sends the code to our backend
//         (POST /auth/github), and the backend returns OUR login token.
//
// Looks: same size, border and colours as the Google button (it follows the
// light/dark theme by itself through Tailwind's "dark:" classes). The GitHub logo
// is an inline SVG painted with "currentColor", so it turns dark in light mode and
// white in dark mode automatically.
//
// The client id comes from frontend/.env (VITE_GITHUB_CLIENT_ID). Without it the
// button is simply hidden, so the rest of the app keeps working.

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

// The sessionStorage key where we remember the random "state" value (see below)
export const GITHUB_STATE_KEY = 'github_oauth_state';

// The official GitHub "mark" logo. fill="currentColor" = uses the text colour.
function GitHubLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// Makes a random hex string, e.g. "9f2c4e...". Used as the OAuth "state".
const createRandomState = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

function GitHubSignInButton() {
  // No client id configured -> hide the button instead of showing a broken one
  if (!GITHUB_CLIENT_ID) {
    console.warn('VITE_GITHUB_CLIENT_ID is missing in frontend/.env — GitHub button hidden.');
    return null;
  }

  // Runs when the user clicks the button
  const handleClick = () => {
    // "state" is a random value we invent for THIS login attempt. GitHub sends it
    // back unchanged, and the callback page checks that it matches. If someone
    // tricks a user into opening a fake callback link, the state won't match and
    // we reject it (this protects against "CSRF" attacks).
    const state = createRandomState();
    sessionStorage.setItem(GITHUB_STATE_KEY, state);

    // scope: what we ask GitHub permission for.
    //   read:user  -> basic profile (name, username, profile link)
    //   user:email -> the user's email addresses (needed to find/create the account)
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: 'read:user user:email',
      state,
    });

    // Leave our site and open GitHub's authorize page
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full h-10 flex items-center justify-center gap-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <GitHubLogo />
      <span>Continue with GitHub</span>
    </button>
  );
}

export default GitHubSignInButton;