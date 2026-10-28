// utils/authStyles.js
// Tailwind class strings shared by every authentication page (Login, Signup,
// ForgotPassword, ResetPassword, VerifyEmail, GitHubCallback) and the form components
// they use. Before this file, each page had its own copy of these strings, so changing
// the look of an input meant editing five files. Now it is one place.

// Label above each input
export const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

// Small red message under an input
export const fieldErrorClass = 'mt-1.5 text-xs text-red-600 dark:text-red-400';

// Text input look, in a normal and an error version. They are two full strings (not a
// normal string plus a red border on top) because when two Tailwind border colors are on
// the same element, the stylesheet order, not the class order, decides which one wins.
// hasIcon = true leaves extra room on the right (used by the password eye button).
const baseInputClass =
  'w-full rounded-xl py-2.5 pl-3.5 text-sm bg-white dark:bg-gray-950/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition focus:outline-none focus:ring-4';

export const getInputClass = (hasError, hasIcon = false) => {
  const paddingRight = hasIcon ? 'pr-11' : 'pr-3.5';

  return hasError
    ? `${baseInputClass} ${paddingRight} border border-red-500 dark:border-red-500 focus:ring-red-500/20`
    : `${baseInputClass} ${paddingRight} border border-gray-300 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20`;
};

// The 6-digit code box (VerifyEmail and ResetPassword): big digits with wide spacing.
// pl-[0.5em] cancels the extra space letter-spacing adds after the LAST digit,
// so the code looks centered.
export const otpInputClass =
  'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950/60 py-3 pl-[0.5em] pr-0 text-center text-2xl font-mono tracking-[0.5em] text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-700 transition focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20';

// The main blue submit button. disabled:active:scale-100 stops the "press" effect
// while the button is disabled (for example during loading).
export const primaryButtonClass =
  'w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

// Message boxes above the form
export const errorBoxClass =
  'mb-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400';
export const successBoxClass =
  'mb-5 rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-950/40 px-3.5 py-2.5 text-sm text-green-700 dark:text-green-400';

// Blue text link, and the small centered text under the form ("Don't have an account?")
export const linkClass = 'font-medium text-blue-600 dark:text-blue-400 hover:underline';
export const footerTextClass = 'mt-6 text-center text-sm text-gray-500 dark:text-gray-400';