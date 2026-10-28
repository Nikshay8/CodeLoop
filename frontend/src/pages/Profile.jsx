// pages/Profile.jsx
// Lets the logged-in user view and edit their name, GitHub link, and LeetCode username.
//
// Compared with a plain form:
// - "Save changes" stays disabled until something is actually different from what is saved,
//   and while a save is running (so a double click cannot send the request twice)
// - the name is checked before sending (2 to 50 characters, same rule as Signup)
// - a toast confirms the save instead of a banner that stays on the page
//
// The input and button looks come from utils/authStyles.js. That file is named after the login
// and signup pages, where those styles started, but they are the app's shared form styles.

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';
import githubLogo from '../assets/github-logo.png';
import leetcodeLogo from '../assets/leetcode-logo.png';
import { validateName } from '../utils/validators';
import {
  labelClass,
  fieldErrorClass,
  getInputClass,
  primaryButtonClass,
  errorBoxClass,
} from '../utils/authStyles';

// An input with a small logo inside its left edge (GitHub, LeetCode).
// pl-10 leaves room for the logo; the rest of the look matches getInputClass() in authStyles.js.
const iconInputClass =
  'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950/60 py-2.5 pl-10 pr-3.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20';

// Builds the request settings that carry the login token
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// The loading placeholder: the same shape as the real page, built from grey blocks
function ProfileSkeleton() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-6 h-24 rounded-2xl" />
      <Skeleton className="mt-6 h-56 rounded-2xl" />
      <Skeleton className="mt-6 h-48 rounded-2xl" />
    </div>
  );
}

function Profile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // read-only, shown for reference
  const [githubUrl, setGithubUrl] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');

  // The values that are currently SAVED on the server. Comparing the form with this
  // is how the page knows whether there is anything to save.
  const [saved, setSaved] = useState({ name: '', githubUrl: '', leetcodeUsername: '' });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // True after the profile has loaded successfully. It lets us tell "the page could not load
  // at all" (full error card) apart from "saving failed" (a banner above the form).
  const [hasLoaded, setHasLoaded] = useState(false);

  // The name's error is shown only after the user left the field or pressed Save
  const [nameTouched, setNameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // The confirmation toast: { id, message } or null
  const [toast, setToast] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/profile', getAuthConfig());

      const loadedName = response.data.name || '';
      const loadedGithub = response.data.githubUrl || '';
      const loadedLeetcode = response.data.leetcodeUsername || '';

      setName(loadedName);
      setEmail(response.data.email);
      setGithubUrl(loadedGithub);
      setLeetcodeUsername(loadedLeetcode);
      setSaved({
        name: loadedName.trim(),
        githubUrl: loadedGithub.trim(),
        leetcodeUsername: loadedLeetcode.trim(),
      });

      setError('');
      setHasLoaded(true);
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Used by the "Try again" button on the error card
  const handleRetry = () => {
    setLoading(true);
    fetchProfile();
  };

  // Is anything different from what is saved? (Spaces at the edges don't count as a change.)
  const isDirty =
    name.trim() !== saved.name ||
    githubUrl.trim() !== saved.githubUrl ||
    leetcodeUsername.trim() !== saved.leetcodeUsername;

  // The name is only checked when it was changed. Otherwise a user whose saved name does not fit
  // the signup rule (for example a very long name that came from Google) could never save
  // a change to the other fields.
  const nameError = name.trim() !== saved.name ? validateName(name) : '';
  const visibleNameError = (nameTouched || submitAttempted) && nameError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitAttempted(true);

    // Stop here if the name is invalid — the message is now visible under the field
    if (nameError) return;

    setIsSaving(true);

    const updates = {
      name: name.trim(),
      githubUrl: githubUrl.trim(),
      leetcodeUsername: leetcodeUsername.trim(),
    };

    try {
      const response = await api.patch('/auth/profile', updates, getAuthConfig());

      // The Navbar (which shows the avatar and the GitHub/LeetCode links) lives
      // outside this page and only loads the profile once, at login. So we announce
      // the updated profile with a custom browser event, and the Navbar listens for it.
      // The server's reply is the full updated user (without the password).
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: response.data }));

      // What we just sent is now the saved state, so the button goes back to disabled
      setSaved(updates);
      setName(updates.name);
      setGithubUrl(updates.githubUrl);
      setLeetcodeUsername(updates.leetcodeUsername);

      setToast({ id: Date.now(), message: 'Profile updated' });
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  // The first load failed: there is no form to show, so offer a retry
  if (!hasLoaded && error) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
          </span>
          <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  // The first letter of the SAVED name, for the big avatar (the same letter the navbar shows)
  const avatarLetter = saved.name ? saved.name.charAt(0).toUpperCase() : '?';

  return (
    // animate-fade-up (defined in tailwind.config.js): the page fades in when it opens
    <div className="animate-fade-up motion-reduce:animate-none max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Edit Profile</h1>

      {/* Who you are: avatar + saved name + email. It changes after a save, not while typing. */}
      <Card className="mt-6 flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
          {avatarLetter}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{saved.name}</p>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{email}</p>
        </div>
      </Card>

      {error && (
        <p role="alert" className={`mt-6 ${errorBoxClass}`}>
          {error}
        </p>
      )}

      {/* noValidate turns off the browser's own pop-up bubbles, so OUR messages are the ones shown */}
      <form onSubmit={handleSubmit} noValidate>
        {/* ----- Account ----- */}
        <Card className="mt-6 space-y-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Account</h2>

          <div>
            <label htmlFor="profile-name" className={labelClass}>Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              autoComplete="name"
              maxLength={50}
              aria-invalid={Boolean(visibleNameError)}
              className={getInputClass(Boolean(visibleNameError))}
            />
            {visibleNameError && <p className={fieldErrorClass}>{visibleNameError}</p>}
          </div>

          <div>
            <label htmlFor="profile-email" className={labelClass}>Email</label>
            {/* Email is read-only — changing it would need its own verification flow, out of scope for now.
                The disabled: classes only apply while the input is disabled (they beat the normal look). */}
            <input
              id="profile-email"
              type="email"
              value={email}
              disabled
              className={`${getInputClass(false)} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-900 dark:disabled:text-gray-500`}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Your email can't be changed yet.</p>
          </div>
        </Card>

        {/* ----- Links ----- */}
        <Card className="mt-6 space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Links</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Shown in your profile menu, so they are one click away.
            </p>
          </div>

          <div>
            <label htmlFor="profile-github" className={labelClass}>GitHub URL</label>
            <div className="relative">
              {/* The logo is dark, so dark:invert turns it white in dark mode */}
              <img
                src={githubLogo}
                alt=""
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 dark:invert"
              />
              <input
                id="profile-github"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/yourusername"
                autoComplete="url"
                className={iconInputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-leetcode" className={labelClass}>LeetCode Username</label>
            <div className="relative">
              <img
                src={leetcodeLogo}
                alt=""
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              />
              <input
                id="profile-leetcode"
                type="text"
                value={leetcodeUsername}
                onChange={(e) => setLeetcodeUsername(e.target.value)}
                placeholder="yourusername"
                autoComplete="username"
                className={iconInputClass}
              />
            </div>
          </div>
        </Card>

        {/* Save row. On a phone the button is full width and sits last (flex-col-reverse puts the
            hint above it); from "sm" up the hint is on the left and the button on the right. */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
            {isDirty ? 'You have unsaved changes.' : ''}
          </p>

          <button
            type="submit"
            disabled={!isDirty || isSaving}
            className={`${primaryButtonClass} sm:w-auto sm:px-8`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* The confirmation toast. key={toast.id} restarts its timer if it is shown again. */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          duration={4000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default Profile;